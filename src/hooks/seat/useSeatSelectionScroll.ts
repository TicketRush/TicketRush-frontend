// 좌석 예매 페이지: 새로고침 후에도 보던 window/맵 스크롤을 유지한다 (#340)
//
// 브라우저 기본 스크롤 복원은 좌석맵이 비동기로 다시 그려지기 전에 동작해
// 위치가 0으로 고정된다. 좌석맵이 준비된 뒤에만 복원하고, 저장은 공연 ID로 한정한다.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
  type UIEvent,
} from "react";
import {
  applySeatSelectionScroll,
  canApplySeatSelectionScroll,
  captureSeatSelectionScroll,
  getSeatSelectionScrollLayout,
  isSeatSelectionScrollForPerformance,
  readSeatSelectionScroll,
  shouldKeepRestoringSeatSelectionScroll,
  writeSeatSelectionScroll,
} from "@/utils/seat/seatSelectionScroll";

interface Options {
  performanceId: number | null;
  /** 좌석맵이 DOM에 올라온 뒤에만 true — 로딩 가드 중에는 복원하지 않는다 */
  ready: boolean;
  containerRef: RefObject<HTMLElement | null>;
}

function scrollWindowTo(windowY: number) {
  window.scrollTo({ top: windowY, left: 0, behavior: "auto" });
}

export function useSeatSelectionScroll({
  performanceId,
  ready,
  containerRef,
}: Options) {
  const restoredForIdRef = useRef<number | null>(null);
  const persistRef = useRef<() => void>(() => {});
  const persistFrameRef = useRef(0);

  const persist = useCallback(() => {
    if (performanceId == null) return;
    writeSeatSelectionScroll(
      captureSeatSelectionScroll(
        performanceId,
        window.scrollY,
        containerRef.current?.scrollLeft ?? 0,
      ),
    );
  }, [containerRef, performanceId]);

  persistRef.current = persist;

  const schedulePersist = useCallback(() => {
    if (persistFrameRef.current) return;
    persistFrameRef.current = window.requestAnimationFrame(() => {
      persistFrameRef.current = 0;
      persistRef.current();
    });
  }, []);

  const onMapScroll = useCallback(
    (_event: UIEvent<HTMLElement>) => {
      schedulePersist();
    },
    [schedulePersist],
  );

  useLayoutEffect(() => {
    if (
      typeof window === "undefined" ||
      !("scrollRestoration" in window.history)
    ) {
      return;
    }
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (!ready || performanceId == null) return;
    if (restoredForIdRef.current === performanceId) return;

    const saved = readSeatSelectionScroll(performanceId);
    if (!isSeatSelectionScrollForPerformance(saved, performanceId)) {
      restoredForIdRef.current = performanceId;
      return;
    }

    let cancelled = false;
    let frameId = 0;
    const startedAt = performance.now();

    const tick = () => {
      if (cancelled) return;

      const mapContainer = containerRef.current;
      applySeatSelectionScroll(saved, {
        scrollWindow: scrollWindowTo,
        mapContainer,
      });

      const layout = getSeatSelectionScrollLayout(mapContainer, {
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
      });
      const applied = canApplySeatSelectionScroll(
        saved,
        layout,
        mapContainer != null,
      );
      const elapsed = performance.now() - startedAt;

      if (!shouldKeepRestoringSeatSelectionScroll(applied, elapsed)) {
        restoredForIdRef.current = performanceId;
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [containerRef, performanceId, ready]);

  useEffect(() => {
    if (!ready || performanceId == null) return;

    const persistNow = () => persistRef.current();
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") persistNow();
    };

    window.addEventListener("scroll", schedulePersist, { passive: true });
    window.addEventListener("pagehide", persistNow);
    document.addEventListener("visibilitychange", persistWhenHidden);

    return () => {
      window.cancelAnimationFrame(persistFrameRef.current);
      persistFrameRef.current = 0;
      window.removeEventListener("scroll", schedulePersist);
      window.removeEventListener("pagehide", persistNow);
      document.removeEventListener("visibilitychange", persistWhenHidden);
    };
  }, [performanceId, ready, schedulePersist]);

  return { onMapScroll };
}

export default useSeatSelectionScroll;
