// 좌석 상태 SSE 구독 hook (이슈 #123 / #335 / #336)
// - SSE(named event: seat-status-changed)가 주 경로
// - 이벤트는 좌석맵·seat-counts 캐시를 setQueryData로 패치 (맵 언마운트·카운트 재조회 없음)
// - 맵에 없는 좌석·카운트 불일치면 counts/맵을 백그라운드 재조회
// - 맵이 처음 준비되면 로드 전 건너뛴 알림을 counts 재조회로 맞춤
// - SSE 연결 중 30초 보정은 맵·counts를 다시 받되, 맵은 좌석 단위로 합친다 (#362)
// - HTTP 스냅샷은 좌석 단위로 합쳐, 방금 SSE로 맞춘 HOLD/SOLD를 덮지 않는다 (#362)
// - 연결 실패/단절 시 짧은 debounce 후 5초 polling fallback (백그라운드 재조회)
// - SSE 재연결(open) 시 debounce/polling 중지
// - unmount 시 EventSource.close + clearTimeout/clearInterval
// - 선택 좌석이 HOLD/SOLD 등으로 바뀌면 seatStore 선택 해제 (+ 토스트)
// - QA: URL `?forceHoldSelected=1` 이면 mock/실API와 무관하게 선택 좌석을 주기적으로 HOLD
// - enabled=false (#181 예매 가능 가드 판정 전/불가) 이면 SSE·polling·QA 타이머 모두 열지 않음
// - #336: getMapQueryKey로 관리자 monitoring 캐시를 같은 공개 스트림으로 패치
// - syncUserSelection=false면 예매 선택 해제·토스트·QA HOLD를 하지 않음
// - #361: connectionStatus로 LIVE / 재연결 중 / 폴링 중을 구분
import { useEffect, useRef, useState } from "react";
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { subscribeSeatStream } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import useSeatStore from "@/stores/reservation/seatStore";
import { clearSelectedSeatIfTaken } from "@/utils/seat/clearSelectedSeatIfTaken";
import {
  applySeatCountDelta,
  findSeatStatus,
  patchSeatMapStatus,
  shouldRefetchUnknownSeat,
  shouldResyncCountsOnMapReady,
  shouldResyncSeatCounts,
} from "@/utils/seat/applySeatStatusUpdate";
import { recordSeatLivePatch } from "@/utils/seat/seatLivePatchTracker";
import {
  seatMapHasAvailable,
  shouldNotifySeatTaken,
} from "@/utils/seat/soldOutNotice";
import type { ConcertStatus } from "@/types/domain/concert";
import type {
  SeatCounts,
  SeatMapData,
  SeatStatus,
  SeatUpdateEvent,
} from "@/types/domain/seat";
import {
  reduceSeatStreamConnection,
  type SeatStreamConnectionEvent,
  type SeatStreamConnectionStatus,
} from "@/utils/seat/seatStreamConnection";

const POLL_INTERVAL_MS = 5_000;
/** onerror 직후 바로 polling 하지 않고, 짧은 재연결 기회를 준 뒤 fallback */
const POLL_FALLBACK_DEBOUNCE_MS = 1_500;
/** SSE가 붙어 있는 동안 놓친 이벤트를 보정하는 주기 */
const SSE_RESYNC_INTERVAL_MS = 30_000;
/** QA 스위치: 선택 좌석 강제 HOLD 주기 */
const FORCE_HOLD_INTERVAL_MS = 2_000;

interface UseSeatEventStreamOptions {
  /** 내 좌석 확인 진행 중 등 — 해당 seatId는 선택 유지 */
  shouldPreserveSelection?: (seatId: number) => boolean;
  /** 판매 종료 안내가 뜰 때는 선택 해제 토스트를 생략 */
  concertStatus?: ConcertStatus;
  /**
   * 패치·재조회할 좌석맵 캐시 키. 기본은 공개 seat-layouts.
   * 관리자 모니터링은 admin seat-monitoring 키를 넘긴다 (#336).
   */
  getMapQueryKey?: (performanceId: number) => QueryKey;
  /**
   * 예매 선택 해제·토스트·QA HOLD. 관리자 맵에서는 false.
   * @default true
   */
  syncUserSelection?: boolean;
}

function defaultMapQueryKey(performanceId: number): QueryKey {
  return queryKeys.seats.byPerformance(performanceId);
}

function queryKeysEqual(a: QueryKey, b: QueryKey): boolean {
  return a.length === b.length && a.every((part, i) => Object.is(part, b[i]));
}

function isForceHoldSelectedEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("forceHoldSelected") === "1"
  );
}

function refetchSeatCaches(
  queryClient: QueryClient,
  mapKey: QueryKey,
  countsKey: QueryKey,
  targets: { map?: boolean; counts?: boolean } = { map: true, counts: true },
) {
  if (targets.map !== false) {
    void queryClient.invalidateQueries({ queryKey: mapKey });
  }
  if (targets.counts !== false) {
    void queryClient.invalidateQueries({ queryKey: countsKey });
  }
}

function patchSeatCaches(
  queryClient: QueryClient,
  mapKey: QueryKey,
  countsKey: QueryKey,
  performanceId: number,
  seatId: number,
  status: SeatStatus,
) {
  const previousStatus = findSeatStatus(
    queryClient.getQueryData<SeatMapData>(mapKey),
    seatId,
  );

  queryClient.setQueryData<SeatMapData>(mapKey, (old) =>
    patchSeatMapStatus(old, seatId, status),
  );

  const seatMap = queryClient.getQueryData<SeatMapData>(mapKey);

  // 화면에 없는 좌석 → 맵이 뜬 뒤에만 서버에서 다시 맞춤
  if (!previousStatus) {
    if (shouldRefetchUnknownSeat(seatMap)) {
      refetchSeatCaches(queryClient, mapKey, countsKey);
    }
    return;
  }
  if (previousStatus === status) return;

  recordSeatLivePatch(performanceId, seatId);

  const currentCounts = queryClient.getQueryData<SeatCounts>(countsKey);
  if (
    !currentCounts ||
    shouldResyncSeatCounts(currentCounts, previousStatus, status)
  ) {
    refetchSeatCaches(queryClient, mapKey, countsKey, {
      map: false,
      counts: true,
    });
    return;
  }

  queryClient.setQueryData<SeatCounts>(countsKey, (old) =>
    old ? applySeatCountDelta(old, previousStatus, status) : old,
  );
}

export function useSeatEventStream(
  performanceId: number | undefined,
  enabled: boolean = true,
  options?: UseSeatEventStreamOptions,
): { connectionStatus: SeatStreamConnectionStatus } {
  const queryClient = useQueryClient();
  const shouldPreserveSelection = options?.shouldPreserveSelection;
  const preserveRef = useRef(shouldPreserveSelection);
  preserveRef.current = shouldPreserveSelection;
  const concertStatusRef = useRef(options?.concertStatus);
  concertStatusRef.current = options?.concertStatus;
  const getMapQueryKeyRef = useRef(options?.getMapQueryKey);
  getMapQueryKeyRef.current = options?.getMapQueryKey;
  const syncUserSelection = options?.syncUserSelection !== false;
  const syncUserSelectionRef = useRef(syncUserSelection);
  syncUserSelectionRef.current = syncUserSelection;
  const [connectionStatus, setConnectionStatus] =
    useState<SeatStreamConnectionStatus>("connecting");

  useEffect(() => {
    if (!performanceId || !enabled) {
      setConnectionStatus("connecting");
      return;
    }

    let disposed = false;
    let pollingId: ReturnType<typeof setInterval> | null = null;
    let resyncId: ReturnType<typeof setInterval> | null = null;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const emitConnection = (event: SeatStreamConnectionEvent) => {
      if (disposed) return;
      setConnectionStatus((current) =>
        reduceSeatStreamConnection(current, event),
      );
    };
    emitConnection("start");
    const mapKey = (getMapQueryKeyRef.current ?? defaultMapQueryKey)(
      performanceId,
    );
    const countsKey = queryKeys.seats.counts(performanceId);

    const applySeatUpdate = (event: SeatUpdateEvent) => {
      if (
        event.performanceId != null &&
        event.performanceId !== performanceId
      ) {
        return;
      }

      patchSeatCaches(
        queryClient,
        mapKey,
        countsKey,
        performanceId,
        event.seatId,
        event.status,
      );

      if (!syncUserSelectionRef.current) return;

      const counts = queryClient.getQueryData<SeatCounts>(countsKey);
      const seatMap = queryClient.getQueryData<SeatMapData>(mapKey);

      clearSelectedSeatIfTaken(event.seatId, event.status, {
        preserve: preserveRef.current?.(event.seatId) ?? false,
        notify: shouldNotifySeatTaken({
          remaining: counts?.availableCount ?? null,
          mapHasAvailable: seatMapHasAvailable(seatMap),
          concertStatus: concertStatusRef.current,
        }),
      });
    };

    const stopPolling = () => {
      if (pollingId == null) return;
      clearInterval(pollingId);
      pollingId = null;
    };

    const stopResync = () => {
      if (resyncId == null) return;
      clearInterval(resyncId);
      resyncId = null;
    };

    const cancelFallbackSchedule = () => {
      if (fallbackTimeoutId == null) return;
      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    };

    const pollOnce = () => {
      refetchSeatCaches(queryClient, mapKey, countsKey);
    };

    const startPolling = () => {
      if (disposed || pollingId != null) return;
      stopResync();
      emitConnection("poll");
      pollOnce();
      pollingId = setInterval(pollOnce, POLL_INTERVAL_MS);
    };

    const startResync = () => {
      if (disposed || resyncId != null || pollingId != null) return;
      resyncId = setInterval(pollOnce, SSE_RESYNC_INTERVAL_MS);
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
        stopResync();
        emitConnection("error");
        schedulePollingFallback();
      },
      onOpen: () => {
        cancelFallbackSchedule();
        stopPolling();
        emitConnection("open");
        startResync();
      },
    });

    return () => {
      disposed = true;
      cancelFallbackSchedule();
      stopPolling();
      stopResync();
      unsubscribe();
    };
  }, [performanceId, enabled, queryClient]);

  // 맵이 처음 뜨면, 로드 전에 건너뛴 SSE 숫자만 서버에서 다시 받는다
  useEffect(() => {
    if (!performanceId || !enabled) return;

    const mapKey = (getMapQueryKeyRef.current ?? defaultMapQueryKey)(
      performanceId,
    );
    const countsKey = queryKeys.seats.counts(performanceId);
    let hadSeats = shouldRefetchUnknownSeat(
      queryClient.getQueryData<SeatMapData>(mapKey),
    );

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      if (!queryKeysEqual(event.query.queryKey, mapKey)) return;

      const next = event.query.state.data as SeatMapData | undefined;
      if (shouldResyncCountsOnMapReady(hadSeats, next)) {
        refetchSeatCaches(queryClient, mapKey, countsKey, {
          map: false,
          counts: true,
        });
      }
      hadSeats = shouldRefetchUnknownSeat(next);
    });

    return unsubscribe;
  }, [performanceId, enabled, queryClient]);

  // ── QA 전용: ?forceHoldSelected=1 (mock 여부 무관) ──
  useEffect(() => {
    if (
      !performanceId ||
      !enabled ||
      !syncUserSelection ||
      !isForceHoldSelectedEnabled()
    ) {
      return;
    }

    console.warn(
      "[QA] forceHoldSelected=1 — 좌석을 선택하면 약 2초 뒤 HOLD로 바뀌고 선택이 해제됩니다. 고를 좌석이 남아 있으면 토스트가 납니다.",
    );

    const mapKey = (getMapQueryKeyRef.current ?? defaultMapQueryKey)(
      performanceId,
    );
    const countsKey = queryKeys.seats.counts(performanceId);

    const timerId = setInterval(() => {
      const selected = useSeatStore.getState().selectedSeat;
      if (!selected) return;
      if (preserveRef.current?.(selected.id)) return;

      const current = findSeatStatus(
        queryClient.getQueryData<SeatMapData>(mapKey),
        selected.id,
      );
      if (current && current !== "AVAILABLE") return;

      patchSeatCaches(
        queryClient,
        mapKey,
        countsKey,
        performanceId,
        selected.id,
        "HOLD",
      );

      const mapAfter = queryClient.getQueryData<SeatMapData>(mapKey);
      const countsAfter = queryClient.getQueryData<SeatCounts>(countsKey);

      clearSelectedSeatIfTaken(selected.id, "HOLD", {
        preserve: preserveRef.current?.(selected.id) ?? false,
        notify: shouldNotifySeatTaken({
          remaining: countsAfter?.availableCount ?? null,
          mapHasAvailable: seatMapHasAvailable(mapAfter),
          concertStatus: concertStatusRef.current,
        }),
      });
    }, FORCE_HOLD_INTERVAL_MS);

    return () => clearInterval(timerId);
  }, [performanceId, enabled, queryClient, syncUserSelection]);

  return { connectionStatus };
}
