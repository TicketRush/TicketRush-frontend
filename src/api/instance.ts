// -------------------------------------------------------
// Axios 인스턴스 + Request/Response Interceptor
//
// 역할 (데이터 레이어):
// - Request: 토큰 자동 주입 (Authorization Bearer)
// - Response: isSuccess 체크, 실패 시 ApiError로 변환, 성공 시 result 추출
//
// UI 처리(toast 등)는 여기서 하지 않음 → queryClient.ts에서 담당
// -------------------------------------------------------

import axios, { type AxiosResponse, type AxiosError } from "axios";
import type { ApiResponse } from "./types/response";
import { isApiError } from "./types/response";
import { ApiError } from "./errors/errorMapper";
import useAuthStore from "../stores/global/authStore";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// -------------------------------------------------------
// Request Interceptor — 토큰 자동 주입 (Feat #8)
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
//
// 동작:
// - 성공 시: response.data를 ApiResponse 포맷에서 result만 꺼내서
//   AxiosResponse.data에 다시 넣어줌 (unwrap)
//   → 사용처에서 response.data가 곧 result가 됨
// - 실패 시: ApiError로 변환해서 throw
// -------------------------------------------------------

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const data = response.data;

    // 백엔드가 isSuccess: false로 내려준 경우 → 에러로 전환
    if (isApiError(data)) {
      throw new ApiError(data, response.status);
    }

    // 성공 시 response.data를 result로 교체 (AxiosResponse 형태 유지)
    // → 사용처: const res = await apiClient.get('/api/concerts');
    //          res.data는 Concert[] (ApiResponse가 아님)
    return {
      ...response,
      data: data.result,
    };
  },
  (error: AxiosError<ApiResponse>) => {
    // 네트워크 에러, 타임아웃 등 HTTP 응답 자체가 없는 경우
    if (axios.isAxiosError(error) && error.response) {
      const data = error.response.data;

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

export default apiClient;
