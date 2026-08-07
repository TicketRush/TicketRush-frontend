// 좌석 상태 SSE 구독 hook (이슈 #123)
// - SSE(named event: seat-status-changed)가 주 경로
// - 연결 실패/단절 시 5초 polling fallback (좌석맵 + 카운트 재조회)
// - SSE 재연결(open) 시 polling 중지
// - unmount 시 EventSource.close + clearInterval
// - 선택 좌석이 HOLD/SOLD 등으로 바뀌면 seatStore 선택 해제
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeSeatStream } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import useSeatStore from "@/stores/reservation/seatStore";
import type { SeatWithStatus, SeatUpdateEvent } from "@/types/domain/seat";

const POLL_INTERVAL_MS = 5_000;

function clearSelectedSeatIfUnavailable(
  seatId: number,
  status: SeatUpdateEvent["status"],
) {
  if (status === "AVAILABLE") return;
  const selected = useSeatStore.getState().selectedSeat;
  if (selected?.id === seatId) {
    useSeatStore.getState().reset();
  }
}

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

      // 내가 고른 좌석이 타인에게 잡히면 선택 해제 (SELECTED 잔상·확인 버튼 방지)
      clearSelectedSeatIfUnavailable(event.seatId, event.status);

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
