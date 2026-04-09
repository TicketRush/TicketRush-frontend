// -------------------------------------------------------
// Axios 인스턴스 + Response Interceptor
//
// 역할 (데이터 레이어):
// - 응답에서 isSuccess 체크
// - 실패 시 ApiError로 변환하여 throw
// - 성공 시 result만 추출하여 반환
//
// UI 처리(토스트 등)는 여기서 하지 않음 → queryClient.ts에서 담당
// -------------------------------------------------------

import axios from "axios";
import type { ApiResponse } from "./types/response";
import { isApiError } from "./types/response";
import { ApiError } from "./errors/errorMapper";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// -------------------------------------------------------
// Response Interceptor
// -------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;

    // 백엔드가 isSuccess: false로 내려준 경우 → 에러로 전환
    if (isApiError(data)) {
      throw new ApiError(data, response.status);
    }

    // 성공 시 result만 꺼내서 반환 (unwrap)
    // → useQuery에서 data가 바로 result 타입이 됨
    return data.result;
  },
  (error) => {
    // 네트워크 에러, 타임아웃 등 HTTP 응답 자체가 없는 경우
    if (axios.isAxiosError(error) && error.response) {
      const data = error.response.data as ApiResponse;

      // 백엔드 에러 응답 포맷이면 ApiError로 변환
      if (data && typeof data.isSuccess === "boolean") {
        throw new ApiError(
          {
            isSuccess: false,
            code: data.code,
            message: data.message,
            result: null,
          },
          error.response.status,
        );
      }
    }

    // 그 외 예상치 못한 에러
    throw new ApiError(
      {
        isSuccess: false,
        code: "UNKNOWN",
        message: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
        result: null,
      },
      0,
    );
  },
);

// -------------------------------------------------------
// Request Interceptor (토큰 주입용 — 인증 이슈에서 확장)
// -------------------------------------------------------

// apiClient.interceptors.request.use((config) => {
//   const token = useAuthStore.getState().accessToken;
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

export default apiClient;
