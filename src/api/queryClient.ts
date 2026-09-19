// -------------------------------------------------------
// QueryClient 설정 + 글로벌 에러 핸들링
//
// 역할 (UI 레이어):
// - ApiError를 받아서 toast로 사용자에게 알림
//
// 에러 파싱/throw는 instance.ts interceptor가 담당.
// 토큰 거부 시 로그아웃·/login 이동도 interceptor의 forceLogout이 담당한다.
// 여기서 다시 리다이렉트하면 로그인 페이지가 리로드된다 (#326).
// -------------------------------------------------------

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "./errors/errorMapper";
import { toast } from "../utils/toast";

// -------------------------------------------------------
// 공통 에러 핸들러
// -------------------------------------------------------

export function handleGlobalError(error: unknown) {
  if (!(error instanceof ApiError)) {
    toast.error("알 수 없는 오류가 발생했습니다.");
    return;
  }

  // 세션 만료 안내는 interceptor가 만든 AUTH_UNAUTHORIZED 메시지와
  // 백엔드 COMMON_401 / AUTH_401_* 메시지를 그대로 쓴다.
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
