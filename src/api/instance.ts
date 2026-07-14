// -------------------------------------------------------
// src/api/instance.ts
// Axios 인스턴스 — 프로젝트 유일한 HTTP 클라이언트
//
// 변경 이력:
// - 2026-05-21:
//   - axios-case-converter 적용 (camelCase ↔ snake_case 자동 변환)
//   - AxiosResponse에 paginationInfo, traceId 필드 추가 (module augmentation)
// - 2026-07-10:
//   - 401 시 refresh 토큰 자동 재발급 로직 추가 (이슈 #120)
//     * 동시성 제어: 진행 중 refresh는 1개만 (Promise 캐싱)
//     * 무한 루프 방지: _retry 플래그로 재시도 요청 스킵
//     * 순환 참조 방지: refresh 요청은 raw axios 사용
//   - Request interceptor에 PUBLIC_ENDPOINTS 화이트리스트 추가
// - 2026-07-11:
//   - PR #114 리뷰 반영: 전역 Content-Type 제거, ignoreHeaders: true 옵션
// - 2026-07-12 (후속 리뷰 반영):
//   - PUBLIC_ENDPOINTS 매칭 로직 개선:
//     * query params/hash 제거 후 pathname으로 비교
//     * exact match(전체 경로 일치) + prefix match(하위 경로) 두 그룹으로 분리
//     * substring match(includes) 사용 안 함 → endpoint 이름 겹치는 오탐지 방지
//   - 재시도 후 두 번째 401 감지 시 로그아웃 안전장치 추가
//     * refresh 성공 후 재시도 요청이 다시 401 반환하는 극단 케이스 방지
//   - refresh 실패 시 원인 로깅 (console.error)
//   - window.location.href → replace: 히스토리 정리
//   - PUBLIC_ENDPOINTS에 as const, API_BASE_URL 상수화, 구조 분해 적용
// -------------------------------------------------------

import axios, { type AxiosResponse, type AxiosError } from "axios";
import applyCaseMiddleware from "axios-case-converter";
import type { ApiResponse } from "./types/response";
import { isApiError } from "./types/response";
import type { PaginationInfo } from "./types/pagination";
import { ApiError } from "./errors/errorMapper";
import useAuthStore from "../stores/global/authStore";

// -------------------------------------------------------
// Module augmentation
// AxiosResponse에 백엔드 envelope의 메타 필드 확장
// (interceptor가 unwrap하면서 result만 data에 넣고 나머지는 여기로)
// -------------------------------------------------------
declare module "axios" {
  export interface AxiosResponse {
    pagination?: PaginationInfo;
    traceId?: string;
  }
  export interface InternalAxiosRequestConfig {
    /** refresh 재시도된 요청 여부 — 무한 루프 방지용 */
    _retry?: boolean;
  }
}

// -------------------------------------------------------
// 상수
// -------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * 인증 불필요 endpoint (전체 경로 완전 일치 매칭)
 *
 * 예: "/api/v1/auth/login" → pathname === "/api/v1/auth/login" 인 경우만 매칭
 * "/api/v1/auth/login/history" 같은 하위 경로는 매칭 안 됨 (인증 필요로 취급)
 */
const PUBLIC_ENDPOINTS_EXACT = [
  "/api/v1/auth/login",
  "/api/v1/auth/social/login",
  "/api/v1/auth/reissue",
  "/api/v1/user/signup",
  "/api/v1/user/exists/email",
] as const;

/**
 * 인증 불필요 endpoint (하위 경로 모두 포함, prefix 매칭)
 *
 * 예: "/api/v1/auth/oauth" → "/api/v1/auth/oauth/kakao/url" 매칭됨
 * 정확히 endpoint 아래로 시작하는 경우만 매칭 (path + "/" 로 시작)
 */
const PUBLIC_ENDPOINTS_PREFIX = [
  "/api/v1/auth/oauth", // /kakao/url, /naver/url 등
  "/api/v1/auth/signup", // /email-verification/send 등
] as const;

/**
 * URL이 인증 불필요 endpoint인지 판별.
 *
 * 안전한 매칭 규칙:
 *   1. query params(?)/hash(#)를 제거하고 pathname만으로 비교
 *      → "/api/v1/user/settings?redirect=/api/v1/auth/login" 같은 우회 방지
 *   2. exact match 또는 path + "/"로 시작하는 경우만 public
 *      → "/api/v1/auth/login-history" 같은 substring 오탐지 방지
 */
function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  const pathname = url.split("?")[0].split("#")[0];

  return (
    PUBLIC_ENDPOINTS_EXACT.some((path) => pathname === path) ||
    PUBLIC_ENDPOINTS_PREFIX.some((path) => pathname.startsWith(path + "/"))
  );
}

// -------------------------------------------------------
// Axios 인스턴스 생성 + case-converter 적용
//
// Content-Type을 전역 설정하지 않음:
//   axios가 request body 타입에 따라 자동으로 Content-Type 설정
//   - JSON body → application/json
//   - FormData → multipart/form-data; boundary=...
//   - Blob/ArrayBuffer → application/octet-stream 등
// -------------------------------------------------------
const rawClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

// applyCaseMiddleware 옵션:
//   ignoreHeaders: true — request 헤더 case 변환 방지
//   (Authorization, X-Internal-Token 등 커스텀 헤더 이름 유지)
const apiClient = applyCaseMiddleware(rawClient, {
  ignoreHeaders: true,
});

// -------------------------------------------------------
// Refresh 토큰 자동 재발급 로직
// -------------------------------------------------------
let refreshingPromise: Promise<string | null> | null = null;

/**
 * 실제 refresh API 호출.
 * 성공 시 새 access token 반환, 실패 시 null 반환.
 *
 * raw axios 사용 (interceptor 미적용) — 무한 루프 방지 + case 변환 없이 snake_case 그대로.
 */
async function performTokenRefresh(): Promise<string | null> {
  const currentRefreshToken = useAuthStore.getState().refreshToken;
  if (!currentRefreshToken) return null;

  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/v1/auth/reissue`,
      { refresh_token: currentRefreshToken },
      { headers: { "Content-Type": "application/json" } },
    );

    // 백엔드 응답 예상: { is_success, code, result: { access_token, refresh_token } }
    const result = res.data?.result;
    if (!result?.access_token) return null;

    useAuthStore
      .getState()
      .setTokens(
        result.access_token,
        result.refresh_token ?? currentRefreshToken,
      );

    return result.access_token;
  } catch (error) {
    // refresh 실패 원인 파악용 로깅
    // (프로덕션에서는 Sentry 등 모니터링 도구 연동 검토)
    console.error("[Refresh Token] 재발급 실패:", error);
    return null;
  }
}

/**
 * 진행 중인 refresh 요청이 있으면 그것을 반환, 없으면 새로 시작.
 * (동시성 제어의 핵심)
 */
function getOrCreateRefreshPromise(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = performTokenRefresh().finally(() => {
    refreshingPromise = null;
  });

  return refreshingPromise;
}

/**
 * 강제 로그아웃 + 로그인 페이지로 리다이렉트.
 *
 * window.location.replace 사용:
 *   - href 대신 replace로 히스토리에 남기지 않음
 *   - 뒤로가기 시 401 만료 페이지 재진입 방지
 *   - UX 개선
 */
function forceLogout(): void {
  useAuthStore.getState().logout();
  window.location.replace("/login");
}

// -------------------------------------------------------
// Request Interceptor
// - 인증 불필요 endpoint는 Authorization 헤더 안 붙임
// - 인증 필요 endpoint만 accessToken 주입
// -------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  if (isPublicEndpoint(config.url)) {
    return config;
  }

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------------------------------------------------------
// Response Interceptor
// 주의: case-converter가 먼저 동작하므로 response.data는 이미 camelCase
// -------------------------------------------------------
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const data = response.data;

    if (isApiError(data)) {
      throw new ApiError(data, response.status);
    }

    // 구조 분해로 가독성 개선
    const { result, paginationInfo, traceId } = data;
    return {
      ...response,
      data: result,
      pagination: paginationInfo,
      traceId,
    };
  },

  async (error: AxiosError<ApiResponse>) => {
    if (!axios.isAxiosError(error) || !error.response) {
      throw new ApiError(
        {
          isSuccess: false,
          code: "NETWORK_ERROR",
          message: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
          result: null,
        },
        0,
      );
    }

    const originalRequest = error.config;
    const { status, data } = error.response;

    // ── 401 Unauthorized ──
    if (status === 401 && originalRequest) {
      // 안전장치: 이미 재시도한 요청인데 또 401
      // → refresh 성공 후 재시도가 다시 401 반환하는 극단 케이스
      // → 즉시 로그아웃 (사용자 UI에서 인증 만료 상태 명확히)
      if (originalRequest._retry) {
        forceLogout();
        throw new ApiError(
          {
            isSuccess: false,
            code: "AUTH_UNAUTHORIZED",
            message: "인증이 만료되었습니다. 다시 로그인해주세요.",
            traceId: data?.traceId,
            result: null,
          },
          401,
        );
      }

      // 첫 번째 401: 인증 필요 endpoint에서만 refresh 시도
      // (public endpoint의 401은 인증 실패 = refresh와 무관)
      if (!isPublicEndpoint(originalRequest.url)) {
        originalRequest._retry = true;

        const newAccessToken = await getOrCreateRefreshPromise();

        if (newAccessToken) {
          // 새 토큰으로 원 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }

        // refresh 실패 → 로그아웃
        forceLogout();
        throw new ApiError(
          {
            isSuccess: false,
            code: "AUTH_UNAUTHORIZED",
            message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
            traceId: data?.traceId,
            result: null,
          },
          401,
        );
      }
    }

    // ── 백엔드 에러 응답 포맷이면 ApiError로 변환 ──
    if (data && typeof data.isSuccess === "boolean") {
      throw new ApiError(
        {
          isSuccess: false,
          code: data.code,
          message: data.message,
          traceId: data.traceId,
          result: null,
        },
        status,
      );
    }

    // ── 그 외 예상치 못한 에러 ──
    throw new ApiError(
      {
        isSuccess: false,
        code: "UNKNOWN",
        message: "알 수 없는 오류가 발생했습니다.",
        result: null,
      },
      status,
    );
  },
);

export default apiClient;
