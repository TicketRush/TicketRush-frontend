// -------------------------------------------------------
// QueryClient 설정 + 글로벌 에러 핸들링
//
// 역할 (UI 레이어):
// - ApiError를 받아서 toast로 사용자에게 알림
// - 401 에러 시 로그인 페이지 리다이렉트 등 공통 처리
//
// 에러 파싱/throw는 instance.ts interceptor가 담당
// -------------------------------------------------------

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError, isUnauthorizedError } from "./errors/errorMapper";
import { toast } from "../utils/toast";

// -------------------------------------------------------
// 공통 에러 핸들러
// -------------------------------------------------------

function handleGlobalError(error: unknown) {
  if (!(error instanceof ApiError)) {
    toast.error("알 수 없는 오류가 발생했습니다.");
    return;
  }

  // 401 → 로그인 페이지로 리다이렉트
  if (isUnauthorizedError(error)) {
    // TODO: Feat #8 완료 후 활성화
    // useAuthStore.getState().logout();
    // window.location.href = '/login';
    toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
    return;
  }

  // 그 외 → ApiError.message (errorMapper가 이미 변환한 UI 메시지)
  toast.error(error.message);
}

// -------------------------------------------------------
// QueryClient 생성
// -------------------------------------------------------

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: handleGlobalError,
  }),
  mutationCache: new MutationCache({
    onError: handleGlobalError,
  }),
});
