// 좌석 상태 SSE 구독 hook (이슈 #123)
// - SSE(named event: seat-status-changed)가 주 경로
// - 연결 실패/단절 시 5초 polling fallback (좌석맵 + 카운트 재조회)
// - SSE 재연결(open) 시 polling 중지
// - unmount 시 EventSource.close + clearInterval
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeSeatStream } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import type { SeatWithStatus, SeatUpdateEvent } from "@/types/domain/seat";

const POLL_INTERVAL_MS = 5_000;

export function useSeatEventStream(performanceId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!performanceId) return;

    let disposed = false;
    let pollingId: ReturnType<typeof setInterval> | null = null;

    const applySeatUpdate = (event: SeatUpdateEvent) => {
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
    };

    const stopPolling = () => {
      if (pollingId == null) return;
      clearInterval(pollingId);
      pollingId = null;
    };

    const pollOnce = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.seats.byPerformance(performanceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.seats.counts(performanceId),
      });
    };

    const startPolling = () => {
      if (disposed || pollingId != null) return;
      pollOnce();
      pollingId = setInterval(pollOnce, POLL_INTERVAL_MS);
    };

    const unsubscribe = subscribeSeatStream(performanceId, applySeatUpdate, {
      onError: () => {
        startPolling();
      },
      onOpen: () => {
        stopPolling();
      },
    });

    return () => {
      disposed = true;
      stopPolling();
      unsubscribe();
    };
  }, [performanceId, queryClient]);
}
