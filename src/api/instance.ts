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
//     * 순환 참조 방지: refresh 요청은 raw axios 사용 (interceptor 우회)
//   - Request interceptor에 PUBLIC_ENDPOINTS 화이트리스트 추가
//     * 로그인/회원가입 등 인증 불필요 endpoint에는 Authorization 헤더 주입 X
//     * 오래된/만료된 accessToken이 로그인 요청에 붙어 403 나던 문제 해결
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
// 인증 불필요 endpoint 화이트리스트
// 로그인/회원가입 등은 아직 accessToken이 없거나 만료된 상태에서 호출.
// 이 요청들에 오래된 Authorization 헤더가 붙으면 백엔드가 인증 실패로 403 반환.
// -------------------------------------------------------
const PUBLIC_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/social/login",
  "/api/v1/auth/oauth/",
  "/api/v1/auth/signup/",
  "/api/v1/auth/reissue",
  "/api/v1/user/signup",
  "/api/v1/user/exists/email",
];

function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((path) => url.includes(path));
}

// -------------------------------------------------------
// Axios 인스턴스 생성 + case-converter 적용
// -------------------------------------------------------
const rawClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

const apiClient = applyCaseMiddleware(rawClient);

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
      `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/auth/reissue`,
      { refresh_token: currentRefreshToken },
      { headers: { "Content-Type": "application/json" } },
    );

    // 백엔드 응답 예상: { is_success, code, result: { access_token, refresh_token } }
    const result = res.data?.result;
    if (!result?.access_token) return null;

    // 새 refresh_token이 없으면 기존 값 유지
    useAuthStore
      .getState()
      .setTokens(
        result.access_token,
        result.refresh_token ?? currentRefreshToken,
      );

    return result.access_token;
  } catch {
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

// -------------------------------------------------------
// Request Interceptor
// - 인증 불필요 endpoint는 Authorization 헤더 안 붙임
// - 인증 필요 endpoint만 accessToken 주입
// -------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  // 인증 불필요 endpoint는 헤더 주입 스킵
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

    return {
      ...response,
      data: data.result,
      pagination: data.paginationInfo,
      traceId: data.traceId,
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

    // ── 401 Unauthorized — refresh 시도 ──
    // 인증 불필요 endpoint는 refresh 시도 자체를 안 함
    // (로그인 endpoint에서 401은 인증 실패 = refresh와 무관)
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const newAccessToken = await getOrCreateRefreshPromise();

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }

      // refresh 실패 → 로그아웃 + 로그인 페이지로
      useAuthStore.getState().logout();
      window.location.href = "/login";

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
