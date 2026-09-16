// 공연 목록 — cursor 기반 infinite scroll
import { useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchConcerts } from "@/api/concerts";
import { queryKeys } from "@/constants/queryKeys";
import type { ConcertListParams } from "@/types/domain/concert";
import {
  createPagedTransientRetry,
  createPagedTransientRetryDelay,
} from "@/utils/query/retryTransientFailures";

export function useConcerts(params: Omit<ConcertListParams, "cursor"> = {}) {
  const pageParamRef = useRef<unknown>(0);

  return useInfiniteQuery({
    queryKey: queryKeys.concerts.list(params),
    queryFn: ({ pageParam }) => {
      pageParamRef.current = pageParam;
      return fetchConcerts({ ...params, cursor: pageParam });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? lastPage.pagination.nextCursor
        : undefined,
    staleTime: 60_000,
    // 첫 페이지는 서버 기동 대기용으로 길게, 다음 페이지는 짧게 재시도
    retry: createPagedTransientRetry(() => pageParamRef.current),
    retryDelay: createPagedTransientRetryDelay(() => pageParamRef.current),
  });
}
