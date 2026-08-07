// 좌석 + 잔여수 조회
// staleTime: 0 — 실시간 데이터 (메모리 리마인더 Sprint 5)
import { useQuery } from "@tanstack/react-query";
import { fetchSeats, fetchSeatCounts } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";

export function useSeats(performanceId: number | undefined) {
  return useQuery({
    queryKey: performanceId
      ? queryKeys.seats.byPerformance(performanceId)
      : ["seats", "invalid"],
    queryFn: () => fetchSeats(performanceId!),
    enabled: !!performanceId,
    staleTime: 0, // 실시간
  });
}

export function useSeatCounts(
  performanceId: number | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: performanceId
      ? queryKeys.seats.counts(performanceId)
      : ["seats", "counts", "invalid"],
    queryFn: () => fetchSeatCounts(performanceId!),
    enabled: !!performanceId && enabled,
    staleTime: 5_000,
  });
}
