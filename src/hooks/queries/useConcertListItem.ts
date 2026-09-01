import { useSyncExternalStore } from "react";
import {
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type {
  ConcertListResponse,
  ConcertSummary,
} from "@/types/domain/concert";

function isListQueryKey(key: readonly unknown[]) {
  const prefix = queryKeys.concerts.listPrefix;
  return key[0] === prefix[0] && key[1] === prefix[1];
}

/**
 * infinite list 캐시의 모든 페이지에서 같은 id를 찾는다 (#203).
 * 첫 페이지만 보면 스크롤로 연 공연이 `-`로 남는다.
 */
export function findConcertInListCache(
  queryClient: QueryClient,
  concertId: number | undefined,
): ConcertSummary | undefined {
  if (concertId == null) return undefined;

  const entries = queryClient.getQueriesData<InfiniteData<ConcertListResponse>>({
    queryKey: queryKeys.concerts.listPrefix,
  });

  for (const [, data] of entries) {
    const found = data?.pages
      ?.flatMap((page) => page.items ?? [])
      .find((item) => item.id === concertId);
    if (found) return found;
  }
  return undefined;
}

/**
 * 상세 게이지용. 목록을 안 거치고 들어오면 undefined → 게이지 `-`.
 */
export function useConcertListItem(concertId: number | undefined) {
  const queryClient = useQueryClient();

  return useSyncExternalStore(
    (onStoreChange) =>
      queryClient.getQueryCache().subscribe((event) => {
        if (isListQueryKey(event.query.queryKey)) {
          onStoreChange();
        }
      }),
    () => findConcertInListCache(queryClient, concertId),
    () => undefined,
  );
}
