// 공연 목록 — cursor 기반 infinite scroll
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchConcerts } from "@/api/concerts";
import { queryKeys } from "@/constants/queryKeys";
import type { ConcertListParams } from "@/types/domain/concert";

export function useConcerts(params: Omit<ConcertListParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.concerts.list(params),
    queryFn: ({ pageParam }) =>
      fetchConcerts({ ...params, cursor: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? lastPage.pagination.nextCursor
        : undefined,
    staleTime: 60_000,
  });
}
