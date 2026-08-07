// 좌석 상태 SSE 구독 hook (이슈 #123)
// - SSE(named event: seat-status-changed)가 주 경로
// - 연결 실패/단절 시 짧은 debounce 후 5초 polling fallback (좌석맵 + 카운트 재조회)
// - SSE 재연결(open) 시 debounce/polling 중지
// - unmount 시 EventSource.close + clearTimeout/clearInterval
// - 선택 좌석이 HOLD/SOLD 등으로 바뀌면 seatStore 선택 해제 (+ 토스트)
// - QA: URL `?forceHoldSelected=1` 이면 mock/실API와 무관하게 선택 좌석을 주기적으로 HOLD
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeSeatStream } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import useSeatStore from "@/stores/reservation/seatStore";
import { clearSelectedSeatIfTaken } from "@/utils/seat/clearSelectedSeatIfTaken";
import type { SeatWithStatus, SeatUpdateEvent } from "@/types/domain/seat";

const POLL_INTERVAL_MS = 5_000;
/** onerror 직후 바로 polling 하지 않고, 짧은 재연결 기회를 준 뒤 fallback */
const POLL_FALLBACK_DEBOUNCE_MS = 1_500;
/** QA 스위치: 선택 좌석 강제 HOLD 주기 */
const FORCE_HOLD_INTERVAL_MS = 2_000;

interface UseSeatEventStreamOptions {
  /** 내 좌석 확인 진행 중 등 — 해당 seatId는 선택 유지 */
  shouldPreserveSelection?: (seatId: number) => boolean;
}

function isForceHoldSelectedEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("forceHoldSelected") ===
    "1"
  );
}

export function useSeatEventStream(
  performanceId: number | undefined,
  options?: UseSeatEventStreamOptions,
) {
  const queryClient = useQueryClient();
  const shouldPreserveSelection = options?.shouldPreserveSelection;

  useEffect(() => {
    if (!performanceId) return;

    let disposed = false;
    let pollingId: ReturnType<typeof setInterval> | null = null;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
      clearSelectedSeatIfTaken(event.seatId, event.status, {
        preserve: shouldPreserveSelection?.(event.seatId) ?? false,
      });

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

    const cancelFallbackSchedule = () => {
      if (fallbackTimeoutId == null) return;
      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
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

    /** 짧은 재연결에 성공하면 open에서 취소됨 → 불필요한 polling 방지 */
    const schedulePollingFallback = () => {
      if (disposed || pollingId != null || fallbackTimeoutId != null) return;
      fallbackTimeoutId = setTimeout(() => {
        fallbackTimeoutId = null;
        startPolling();
      }, POLL_FALLBACK_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeSeatStream(performanceId, applySeatUpdate, {
      onError: () => {
        schedulePollingFallback();
      },
      onOpen: () => {
        cancelFallbackSchedule();
        stopPolling();
      },
    });

    return () => {
      disposed = true;
      cancelFallbackSchedule();
      stopPolling();
      unsubscribe();
    };
  }, [performanceId, queryClient, shouldPreserveSelection]);

  // ── QA 전용: ?forceHoldSelected=1 (mock 여부 무관) ──
  useEffect(() => {
    if (!performanceId || !isForceHoldSelectedEnabled()) return;

    console.info(
      "[QA] forceHoldSelected=1 — 좌석을 선택하면 약 2초 뒤 HOLD + 선택 해제 토스트가 납니다.",
    );

    const timerId = setInterval(() => {
      const selected = useSeatStore.getState().selectedSeat;
      if (!selected) return;
      if (shouldPreserveSelection?.(selected.id)) return;

      const seats = queryClient.getQueryData<SeatWithStatus[]>(
        queryKeys.seats.byPerformance(performanceId),
      );
      const current = seats?.find((s) => s.id === selected.id);
      // 캐시에 아직 없거나 이미 HOLD/SOLD면 스킵
      if (current && current.status !== "AVAILABLE") return;

      queryClient.setQueryData<SeatWithStatus[]>(
        queryKeys.seats.byPerformance(performanceId),
        (old) => {
          if (!old) return old;
          return old.map((seat) =>
            seat.id === selected.id ? { ...seat, status: "HOLD" } : seat,
          );
        },
      );

      clearSelectedSeatIfTaken(selected.id, "HOLD", {
        preserve: shouldPreserveSelection?.(selected.id) ?? false,
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.seats.counts(performanceId),
      });
    }, FORCE_HOLD_INTERVAL_MS);

    return () => clearInterval(timerId);
  }, [performanceId, queryClient, shouldPreserveSelection]);
}
