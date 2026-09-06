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
import { hasSeatCounts } from "@/utils/concert/hasSeatCounts";

function isListQueryKey(key: readonly unknown[]) {
  const prefix = queryKeys.concerts.listPrefix;
  return key[0] === prefix[0] && key[1] === prefix[1];
}

/**
 * infinite list 캐시의 모든 페이지에서 같은 id를 찾는다 (#203).
 * 첫 페이지만 보면 스크롤로 연 공연이 `-`로 남는다.
 * 필터별 list 캐시가 여러 개이면 좌석 수가 있는 항목을 우선한다.
 */
export function findConcertInListCache(
  queryClient: QueryClient,
  concertId: number | undefined,
): ConcertSummary | undefined {
  if (concertId == null) return undefined;

  const entries = queryClient.getQueriesData<InfiniteData<ConcertListResponse>>({
    queryKey: queryKeys.concerts.listPrefix,
  });

  let fallback: ConcertSummary | undefined;

  for (const [, data] of entries) {
    const found = data?.pages
      ?.flatMap((page) => page.items ?? [])
      .find((item) => item.id === concertId);

    if (!found) continue;
    if (hasSeatCounts(found)) return found;
    fallback ??= found;
  }

  return fallback;
}

/**
 * 상세 게이지용. 없으면 상세에서 seat-counts로 폴백한다 (#203).
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
