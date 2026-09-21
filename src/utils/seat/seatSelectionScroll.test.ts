import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySeatSelectionScroll,
  canApplySeatSelectionScroll,
  captureSeatSelectionScroll,
  getSeatSelectionScrollLayout,
  isSeatSelectionScrollForPerformance,
  parseSeatSelectionScroll,
  readSeatSelectionScroll,
  SEAT_SELECTION_SCROLL_RESTORE_BUDGET_MS,
  seatSelectionScrollStorageKey,
  shouldKeepRestoringSeatSelectionScroll,
  writeSeatSelectionScroll,
} from "./seatSelectionScroll";

function createSessionStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

const valid = {
  performanceId: 12,
  windowY: 480,
  mapScrollLeft: 160,
};

describe("parseSeatSelectionScroll", () => {
  it("유효한 JSON만 복원 후보로 남긴다", () => {
    expect(parseSeatSelectionScroll(JSON.stringify(valid))).toEqual(valid);
  });

  it("없거나 깨진 값은 버린다", () => {
    expect(parseSeatSelectionScroll(null)).toBeNull();
    expect(parseSeatSelectionScroll("")).toBeNull();
    expect(parseSeatSelectionScroll("{")).toBeNull();
    expect(parseSeatSelectionScroll("not-json")).toBeNull();
  });

  it("공연 ID·스크롤이 숫자가 아니거나 음수면 버린다", () => {
    expect(
      parseSeatSelectionScroll(
        JSON.stringify({ ...valid, performanceId: "12" }),
      ),
    ).toBeNull();
    expect(
      parseSeatSelectionScroll(JSON.stringify({ ...valid, performanceId: 0 })),
    ).toBeNull();
    expect(
      parseSeatSelectionScroll(
        JSON.stringify({ ...valid, performanceId: 1.5 }),
      ),
    ).toBeNull();
    expect(
      parseSeatSelectionScroll(JSON.stringify({ ...valid, windowY: -1 })),
    ).toBeNull();
    expect(
      parseSeatSelectionScroll(
        JSON.stringify({ ...valid, mapScrollLeft: Number.NaN }),
      ),
    ).toBeNull();
    expect(
      parseSeatSelectionScroll(
        JSON.stringify({ ...valid, windowY: Number.POSITIVE_INFINITY }),
      ),
    ).toBeNull();
  });
});

describe("isSeatSelectionScrollForPerformance", () => {
  it("같은 공연만 복원하고 다른 공연은 무시한다", () => {
    expect(isSeatSelectionScrollForPerformance(valid, 12)).toBe(true);
    expect(isSeatSelectionScrollForPerformance(valid, 99)).toBe(false);
    expect(isSeatSelectionScrollForPerformance(null, 12)).toBe(false);
  });
});

describe("captureSeatSelectionScroll", () => {
  it("음수 스크롤은 0으로 올린다", () => {
    expect(captureSeatSelectionScroll(3, -10, -4)).toEqual({
      performanceId: 3,
      windowY: 0,
      mapScrollLeft: 0,
    });
  });
});

describe("applySeatSelectionScroll", () => {
  it("window와 좌석맵 컨테이너 스크롤을 함께 맞춘다", () => {
    const scrollWindow = vi.fn();
    const mapContainer = { scrollLeft: 0 };

    applySeatSelectionScroll(valid, { scrollWindow, mapContainer });

    expect(scrollWindow).toHaveBeenCalledWith(480);
    expect(mapContainer.scrollLeft).toBe(160);
  });

  it("맵 컨테이너가 없으면 window만 복원한다", () => {
    const scrollWindow = vi.fn();

    applySeatSelectionScroll(valid, { scrollWindow, mapContainer: null });

    expect(scrollWindow).toHaveBeenCalledWith(480);
  });
});

describe("canApplySeatSelectionScroll", () => {
  it("페이지·맵이 저장 오프셋을 담을 수 있을 때만 true", () => {
    expect(
      canApplySeatSelectionScroll(
        valid,
        { pageMaxY: 500, mapMaxLeft: 200 },
        true,
      ),
    ).toBe(true);
    expect(
      canApplySeatSelectionScroll(
        valid,
        { pageMaxY: 100, mapMaxLeft: 200 },
        true,
      ),
    ).toBe(false);
    expect(
      canApplySeatSelectionScroll(
        valid,
        { pageMaxY: 500, mapMaxLeft: 20 },
        true,
      ),
    ).toBe(false);
    expect(
      canApplySeatSelectionScroll(
        valid,
        { pageMaxY: 500, mapMaxLeft: 0 },
        false,
      ),
    ).toBe(false);
  });

  it("0 오프셋은 레이아웃이 짧아도 적용 가능하다", () => {
    expect(
      canApplySeatSelectionScroll(
        { performanceId: 1, windowY: 0, mapScrollLeft: 0 },
        { pageMaxY: 0, mapMaxLeft: 0 },
        false,
      ),
    ).toBe(true);
  });
});

describe("getSeatSelectionScrollLayout", () => {
  it("페이지·맵이 스크롤할 수 있는 최댓값을 계산한다", () => {
    expect(
      getSeatSelectionScrollLayout(
        { scrollWidth: 800, clientWidth: 320 },
        { scrollHeight: 2000, innerHeight: 700 },
      ),
    ).toEqual({ pageMaxY: 1300, mapMaxLeft: 480 });
  });
});

describe("shouldKeepRestoringSeatSelectionScroll", () => {
  it("적용될 때까지 예산 안에서만 재시도한다", () => {
    expect(shouldKeepRestoringSeatSelectionScroll(false, 0)).toBe(true);
    expect(
      shouldKeepRestoringSeatSelectionScroll(
        false,
        SEAT_SELECTION_SCROLL_RESTORE_BUDGET_MS,
      ),
    ).toBe(false);
    expect(shouldKeepRestoringSeatSelectionScroll(true, 16)).toBe(false);
  });
});

describe("readSeatSelectionScroll / writeSeatSelectionScroll", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("공연별로 위치를 따로 저장한다", () => {
    writeSeatSelectionScroll(valid);
    writeSeatSelectionScroll({
      performanceId: 99,
      windowY: 10,
      mapScrollLeft: 4,
    });

    expect(
      sessionStorage.getItem(seatSelectionScrollStorageKey(12)),
    ).toBe(JSON.stringify(valid));
    expect(readSeatSelectionScroll(12)).toEqual(valid);
    expect(readSeatSelectionScroll(99)).toEqual({
      performanceId: 99,
      windowY: 10,
      mapScrollLeft: 4,
    });
  });

  it("스토리지 기록이 막혀도 예외를 밖으로 내지 않는다", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    });

    expect(() => writeSeatSelectionScroll(valid)).not.toThrow();
    expect(readSeatSelectionScroll(12)).toBeNull();
  });
});
