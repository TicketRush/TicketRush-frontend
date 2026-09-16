import { ApiError } from "@/api/errors/errorMapper";

/** 서버 기동·일시 5xx/네트워크 대기용. 대략 1~2분까지 커버 */
export const MAX_TRANSIENT_RETRIES = 10;

/** 무한 스크롤 다음 페이지 — 짧게 재시도해 UX가 오래 멈추지 않게 함 */
export const MAX_NEXT_PAGE_RETRIES = 2;

const NEXT_PAGE_MAX_DELAY_MS = 3_000;
const INITIAL_MAX_DELAY_MS = 15_000;

/**
 * 일시 실패로 재시도할지 여부.
 * - 네트워크(httpStatus 0)·5xx: 재시도
 * - 408 Request Timeout: 게이트웨이 기동 중 등 → 재시도
 * - 그 외 4xx: 재시도하지 않음
 */
export function isRetryableTransientError(error: Error): boolean {
  if (!(error instanceof ApiError) || error.httpStatus == null) {
    return true;
  }
  const status = error.httpStatus;
  if (status === 408) return true;
  if (status >= 400 && status < 500) return false;
  return true;
}

export function retryTransientFailures(failureCount: number, error: Error) {
  if (!isRetryableTransientError(error)) return false;
  return failureCount < MAX_TRANSIENT_RETRIES;
}

export function transientRetryDelay(attemptIndex: number) {
  return Math.min(1000 * 2 ** attemptIndex, INITIAL_MAX_DELAY_MS);
}

/** 첫 페이지 vs 다음 페이지에 따라 재시도 횟수·대기 상한을 다르게 적용 */
export function createPagedTransientRetry(getPageParam: () => unknown) {
  return (failureCount: number, error: Error) => {
    if (!isRetryableTransientError(error)) return false;
    const isInitialPage = getPageParam() === 0;
    const maxRetries = isInitialPage
      ? MAX_TRANSIENT_RETRIES
      : MAX_NEXT_PAGE_RETRIES;
    return failureCount < maxRetries;
  };
}

export function createPagedTransientRetryDelay(getPageParam: () => unknown) {
  return (attemptIndex: number) => {
    const maxDelay =
      getPageParam() === 0 ? INITIAL_MAX_DELAY_MS : NEXT_PAGE_MAX_DELAY_MS;
    return Math.min(1000 * 2 ** attemptIndex, maxDelay);
  };
}

export const transientQueryRetryOptions = {
  retry: retryTransientFailures,
  retryDelay: transientRetryDelay,
} as const;
