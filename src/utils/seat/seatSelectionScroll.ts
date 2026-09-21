// 좌석 예매 페이지 스크롤 위치 (#340)
//
// AdminConcertFormPage의 캐릭터 제작소 왕복 저장과 달리,
// 이 페이지는 좌석맵이 비동기로 다시 그려진 뒤에 window + 맵 가로 스크롤을
// 복원해야 한다. 저장값은 공연 ID별 키로 구분한다.

export const SEAT_SELECTION_SCROLL_KEY = "ticketRush:seat-selection-scroll";
export const SEAT_SELECTION_SCROLL_RESTORE_BUDGET_MS = 1_500;

export interface SeatSelectionScrollPosition {
  performanceId: number;
  windowY: number;
  mapScrollLeft: number;
}

export interface SeatSelectionScrollLayout {
  pageMaxY: number;
  mapMaxLeft: number;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function seatSelectionScrollStorageKey(performanceId: number): string {
  return `${SEAT_SELECTION_SCROLL_KEY}:${performanceId}`;
}

export function parseSeatSelectionScroll(
  raw: string | null,
): SeatSelectionScrollPosition | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      performanceId?: unknown;
      windowY?: unknown;
      mapScrollLeft?: unknown;
    };

    if (
      typeof parsed.performanceId !== "number" ||
      !Number.isSafeInteger(parsed.performanceId) ||
      parsed.performanceId <= 0 ||
      !isNonNegativeFiniteNumber(parsed.windowY) ||
      !isNonNegativeFiniteNumber(parsed.mapScrollLeft)
    ) {
      return null;
    }

    return {
      performanceId: parsed.performanceId,
      windowY: parsed.windowY,
      mapScrollLeft: parsed.mapScrollLeft,
    };
  } catch {
    return null;
  }
}

export function isSeatSelectionScrollForPerformance(
  position: SeatSelectionScrollPosition | null,
  performanceId: number,
): position is SeatSelectionScrollPosition {
  return position != null && position.performanceId === performanceId;
}

export function captureSeatSelectionScroll(
  performanceId: number,
  windowY: number,
  mapScrollLeft: number,
): SeatSelectionScrollPosition {
  return {
    performanceId,
    windowY: Math.max(0, windowY),
    mapScrollLeft: Math.max(0, mapScrollLeft),
  };
}

export function applySeatSelectionScroll(
  position: SeatSelectionScrollPosition,
  targets: {
    scrollWindow: (windowY: number) => void;
    mapContainer: { scrollLeft: number } | null;
  },
): void {
  targets.scrollWindow(position.windowY);
  if (targets.mapContainer) {
    targets.mapContainer.scrollLeft = position.mapScrollLeft;
  }
}

export function getSeatSelectionScrollLayout(
  mapContainer: Pick<HTMLElement, "scrollWidth" | "clientWidth"> | null,
  viewport: { scrollHeight: number; innerHeight: number },
): SeatSelectionScrollLayout {
  return {
    pageMaxY: Math.max(0, viewport.scrollHeight - viewport.innerHeight),
    mapMaxLeft: mapContainer
      ? Math.max(0, mapContainer.scrollWidth - mapContainer.clientWidth)
      : 0,
  };
}

/** 저장한 오프셋을 레이아웃이 아직 담지 못하면 복원을 한 프레임 더 미룬다. */
export function canApplySeatSelectionScroll(
  position: SeatSelectionScrollPosition,
  layout: SeatSelectionScrollLayout,
  hasMapContainer: boolean,
): boolean {
  if (position.windowY > 0 && layout.pageMaxY + 1 < position.windowY) {
    return false;
  }
  if (position.mapScrollLeft > 0) {
    if (!hasMapContainer) return false;
    if (layout.mapMaxLeft + 1 < position.mapScrollLeft) return false;
  }
  return true;
}

export function shouldKeepRestoringSeatSelectionScroll(
  applied: boolean,
  elapsedMs: number,
): boolean {
  return !applied && elapsedMs < SEAT_SELECTION_SCROLL_RESTORE_BUDGET_MS;
}

export function readSeatSelectionScroll(
  performanceId: number,
): SeatSelectionScrollPosition | null {
  try {
    return parseSeatSelectionScroll(
      sessionStorage.getItem(seatSelectionScrollStorageKey(performanceId)),
    );
  } catch {
    return null;
  }
}

export function writeSeatSelectionScroll(
  position: SeatSelectionScrollPosition,
): void {
  try {
    sessionStorage.setItem(
      seatSelectionScrollStorageKey(position.performanceId),
      JSON.stringify(position),
    );
  } catch {
    // 사파리 프라이빗 모드 등 스토리지 차단 시 예매 흐름은 유지
  }
}
