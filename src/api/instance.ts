// -------------------------------------------------------
// src/api/instance.ts
// Axios 인스턴스 — 프로젝트 유일한 HTTP 클라이언트
//
// 변경 이력:
// - 2026-05-21:
//   - axios-case-converter 적용 (camelCase ↔ snake_case 자동 변환)
//   - AxiosResponse에 paginationInfo, traceId 필드 추가 (module augmentation)
// - 2026-07-10:
//   - 401 시 refresh 토큰 자동 재발급 로직 추가
//   - 동시성 제어 (진행 중 refresh는 1개만) + 무한 루프 방지 (_retry 플래그)
//   - 순환 참조 방지: refresh 요청은 raw axios 직접 호출 (interceptor 우회)
//
// 역할 (데이터 레이어):
// - Request: 토큰 자동 주입 + case 변환
// - Response 성공: case 변환 → isSuccess 체크 → result 추출
//   + paginationInfo, traceId는 response 객체에 보존
// - Response 실패: ApiError throw
// - 401: refresh 시도 → 성공 시 원 요청 재시도 → 실패 시 로그아웃 + /login
//
// UI 처리(toast 등)는 queryClient.ts에서 담당
// mock은 이 미들웨어를 거치지 않으므로 mock은 항상 camelCase로 유지
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
// AxiosResponse에 백엔드 envelope의 메타 필드 추가
// (interceptor가 unwrap하면서 result만 data에 넣고, 나머지는 여기로)
// InternalAxiosRequestConfig에 _retry 플래그 추가 (refresh 재시도 여부)
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

const rawClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// -------------------------------------------------------
// axios-case-converter 적용
// - request body/params: camelCase → snake_case
// - response body: snake_case → camelCase
// - headers는 변환 안 함 (Authorization, X-Internal-Token 등 보호)
// -------------------------------------------------------
const apiClient = applyCaseMiddleware(rawClient);

// -------------------------------------------------------
// Refresh 토큰 자동 재발급 로직
//
// 동시성 제어:
//   여러 요청이 동시에 401을 받을 경우, refresh 요청은 1번만 나가고
//   나머지 요청은 진행 중인 Promise를 공유한다.
//
// 순환 참조 방지:
//   refresh 요청은 apiClient가 아닌 raw axios로 직접 호출.
//   → interceptor를 거치지 않아 401 발생 시 재귀 refresh가 일어나지 않음.
//   → axios-case-converter 미적용이므로 request/response는 백엔드 스펙(snake_case) 그대로.
// -------------------------------------------------------

let refreshingPromise: Promise<string | null> | null = null;

/**
 * 실제 refresh API 호출.
 * 성공 시 새 access token 반환, 실패 시 null 반환.
 */
async function performTokenRefresh(): Promise<string | null> {
  const currentRefreshToken = useAuthStore.getState().refreshToken;
  if (!currentRefreshToken) return null;

  try {
    // raw axios 사용 (interceptor 없음 = 무한 루프 방지, case 변환 없음 = snake_case 그대로)
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/auth/reissue`,
      { refresh_token: currentRefreshToken },
      { headers: { "Content-Type": "application/json" } },
    );

    // 백엔드 응답 envelope 예상:
    // { is_success: true, code: "COMMON_200", result: { access_token, refresh_token, ... } }
    const result = res.data?.result;
    if (!result?.access_token) return null;

    // 새 refresh_token이 응답에 없으면 기존 refresh 유지 (백엔드 스펙에 따라 조정)
    useAuthStore
      .getState()
      .setTokens(
        result.access_token,
        result.refresh_token ?? currentRefreshToken,
      );

    return result.access_token;
  } catch {
    // 네트워크 에러 or 401(refresh 만료) 등 모두 실패로 취급
    return null;
  }
}

/**
 * 진행 중인 refresh 요청이 있으면 그것을 반환,
 * 없으면 새로 시작.
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
// Request Interceptor — 토큰 자동 주입
// -------------------------------------------------------
apiClient.interceptors.request.use((config) => {
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

    // 성공 — result로 unwrap하고 pagination/traceId는 별도 필드로 보존
    return {
      ...response,
      data: data.result,
      pagination: data.paginationInfo,
      traceId: data.traceId,
    };
  },

  async (error: AxiosError<ApiResponse>) => {
    if (!axios.isAxiosError(error) || !error.response) {
      // 네트워크 에러, 타임아웃 등 HTTP 응답 자체가 없는 경우
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
    // refresh 시도 → 성공 시 원 요청 재시도, 실패 시 로그아웃
    // 이미 refresh 재시도된 요청(_retry=true)은 스킵 (무한 루프 방지)
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const newAccessToken = await getOrCreateRefreshPromise();

      if (newAccessToken) {
        // 원 요청의 Authorization 헤더 갱신 후 재시도
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
