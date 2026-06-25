// -------------------------------------------------------
// src/api/instance.ts
// Axios 인스턴스 — 프로젝트 유일한 HTTP 클라이언트
//
// 변경 이력:
// - 2026-05-21:
//   - axios-case-converter 적용 (camelCase ↔ snake_case 자동 변환)
//   - AxiosResponse에 paginationInfo, traceId 필드 추가 (module augmentation)
//
// 역할 (데이터 레이어):
// - Request: 토큰 자동 주입 + case 변환
// - Response 성공: case 변환 → isSuccess 체크 → result 추출
//   + paginationInfo, traceId는 response 객체에 보존
// - Response 실패: ApiError throw
// - 401: 자동 로그아웃 + /login 리다이렉트
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
// -------------------------------------------------------
declare module "axios" {
  export interface AxiosResponse {
    pagination?: PaginationInfo;
    traceId?: string;
  }
}

const rawClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
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

  (error: AxiosError<ApiResponse>) => {
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

    const { status, data } = error.response;

    // ── 401 Unauthorized ──
    // refresh token 갱신은 백엔드 합의 후 아래 주석 해제
    if (status === 401) {
      // TODO: refresh token 로직 (POST /api/v1/auth/reissue)
      // const refreshed = await tryRefreshToken();
      // if (refreshed) return apiClient(error.config!);

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
