// 공연 좌석 상태별 카운트 조회 훅
//
// 백엔드: GET /api/v1/seat/{performanceId}/seat-counts
// 응답: { totalCount, availableCount, soldCount, holdCount }
//
// 사용처:
//   - ConcertCard/ConcertDetailPage: 잔여 좌석 표시
//   - SeatSelectionPage: 초기 카운트 표시 (SSE와 병행)
//
// ⚠️ staleTime: 0 — 실시간 잔여 좌석 특성상 매번 fresh 요청.
// SSE 이벤트 발생 시 invalidateQueries로 refetch 트리거 가능.
import { useQuery } from "@tanstack/react-query";
import { fetchSeatCounts } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";

export function useSeatCounts(performanceId: number | undefined) {
  return useQuery({
    queryKey: performanceId
      ? queryKeys.seats.counts(performanceId)
      : ["seats", "counts", "invalid"],
    queryFn: () => fetchSeatCounts(performanceId!),
    enabled: !!performanceId,
    staleTime: 0,
  });
}
