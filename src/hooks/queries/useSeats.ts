// 좌석 배치 + 잔여수 조회 (이슈 #122)
// - useSeats / useSeatLayouts: seat-layouts (좌석맵)
// - useSeatCounts: seat-counts (상태별 수)
// staleTime: 0 — 좌석맵은 실시간 (SSE #123과 병행)
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

<<<<<<< HEAD
export function useSeatCounts(
  performanceId: number | undefined,
  enabled: boolean = true,
) {
=======
/** 이슈 #122 네이밍 별칭 — useSeats와 동일 */
export const useSeatLayouts = useSeats;

export function useSeatCounts(performanceId: number | undefined) {
>>>>>>> 78c6cff ([Feat] #122 좌석 배치/카운트/번호 실 API 연동 마무리)
  return useQuery({
    queryKey: performanceId
      ? queryKeys.seats.counts(performanceId)
      : ["seats", "counts", "invalid"],
    queryFn: () => fetchSeatCounts(performanceId!),
    enabled: !!performanceId && enabled,
    staleTime: 5_000,
  });
}
