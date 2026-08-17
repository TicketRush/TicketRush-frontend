// 좌석 배치 + 잔여수 조회 (이슈 #122)
// - useSeats / useSeatLayouts: seat-layouts (좌석맵)
// - useSeatCounts: seat-counts (상태별 수)
// staleTime: 0 — 좌석맵은 실시간 (SSE #123과 병행)
import { useQuery } from "@tanstack/react-query";
import { fetchSeats, fetchSeatCounts } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";

interface UseSeatCountsOptions {
  /**
   * true면 캐시를 믿지 않고 마운트 시 항상 재조회.
   * seats 진입 가드(#181)처럼 최신 잔여 좌석이 필요할 때 사용.
   */
  fresh?: boolean;
}

export function useSeats(
  performanceId: number | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: performanceId
      ? queryKeys.seats.byPerformance(performanceId)
      : ["seats", "invalid"],
    queryFn: () => fetchSeats(performanceId!),
    enabled: !!performanceId && enabled,
    staleTime: 0, // 실시간
  });
}

/** 이슈 #122 네이밍 별칭 — useSeats와 동일 */
export const useSeatLayouts = useSeats;

export function useSeatCounts(
  performanceId: number | undefined,
  enabled: boolean = true,
  options?: UseSeatCountsOptions,
) {
  const fresh = options?.fresh === true;

  return useQuery({
    queryKey: performanceId
      ? queryKeys.seats.counts(performanceId)
      : ["seats", "counts", "invalid"],
    queryFn: () => fetchSeatCounts(performanceId!),
    enabled: !!performanceId && enabled,
    staleTime: fresh ? 0 : 5_000,
    refetchOnMount: fresh ? "always" : true,
  });
}
