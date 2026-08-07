// 좌석 상태 SSE 구독 hook
// SSE 이벤트 수신 시 React Query 캐시를 직접 patch
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeSeatStream } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import type { SeatWithStatus, SeatUpdateEvent } from "@/types/domain/seat";

export function useSeatEventStream(
  performanceId: number | undefined,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!performanceId || !enabled) return;

    const unsubscribe = subscribeSeatStream(
      performanceId,
      (event: SeatUpdateEvent) => {
        // 캐시의 좌석 한 개만 patch (전체 다시 가져오지 않음)
        queryClient.setQueryData<SeatWithStatus[]>(
          queryKeys.seats.byPerformance(performanceId),
          (old) => {
            if (!old) return old;
            return old.map((seat) =>
              seat.id === event.seatId
                ? { ...seat, status: event.status }
                : seat,
            );
          },
        );

        // 좌석 잔여 수도 같이 무효화 (간단히 다시 fetch)
        queryClient.invalidateQueries({
          queryKey: queryKeys.seats.counts(performanceId),
        });
      },
    );

    return unsubscribe;
  }, [performanceId, enabled, queryClient]);
}
