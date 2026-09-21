import { describe, expect, it } from "vitest";
import type {
  SeatCounts,
  SeatMapData,
  SeatWithStatus,
} from "@/types/domain/seat";
import {
  hasProtectedLivePatch,
  mergeSeatMapSnapshot,
  resolveCountsSnapshot,
  seatMapCountsDisagree,
  SEAT_LIVE_PATCH_STICKY_MS,
  shouldPreserveLiveSeatStatus,
  tallySeatMapStatuses,
} from "./seatMapLiveMerge";

function seat(
  id: number,
  status: SeatWithStatus["status"] = "AVAILABLE",
): SeatWithStatus {
  return {
    id,
    seatLayoutId: 1,
    seatNumber: `A-${id}`,
    row: "A",
    col: id,
    status,
  };
}

function mapOf(...seats: SeatWithStatus[]): SeatMapData {
  return {
    layout: { totalRows: 1, maxCols: seats.length },
    layoutReady: true,
    seats,
  };
}

const counts: SeatCounts = {
  totalCount: 2,
  availableCount: 1,
  holdCount: 1,
  soldCount: 0,
};

describe("shouldPreserveLiveSeatStatus", () => {
  it("조회가 떠 있는 동안 들어온 SSE는 스냅샷보다 우선한다", () => {
    expect(shouldPreserveLiveSeatStatus(150, 100, 200)).toBe(true);
  });

  it("sticky 안이면 조회가 패치 뒤에 시작돼도 지킨다", () => {
    expect(
      shouldPreserveLiveSeatStatus(
        100,
        105,
        100 + SEAT_LIVE_PATCH_STICKY_MS - 1,
      ),
    ).toBe(true);
  });

  it("sticky가 끝나면 HTTP 스냅샷을 받아들인다", () => {
    expect(
      shouldPreserveLiveSeatStatus(100, 200, 100 + SEAT_LIVE_PATCH_STICKY_MS),
    ).toBe(false);
    expect(shouldPreserveLiveSeatStatus(undefined, 100, 200)).toBe(false);
  });
});

describe("mergeSeatMapSnapshot", () => {
  it("SSE로 HOLD가 된 칸은 늦은 AVAILABLE 스냅샷에 덮이지 않는다", () => {
    const current = mapOf(seat(1, "HOLD"), seat(2, "AVAILABLE"));
    const snapshot = mapOf(seat(1, "AVAILABLE"), seat(2, "SOLD"));

    const merged = mergeSeatMapSnapshot({
      current,
      snapshot,
      patchedAtBySeatId: new Map([[1, 150]]),
      fetchStartedAt: 100,
      now: 160,
    });

    expect(merged.seats[0].status).toBe("HOLD");
    expect(merged.seats[1].status).toBe("SOLD");
    expect(merged.layout).toEqual(snapshot.layout);
  });

  it("강제 해제·새로고침처럼 패치 직후 조회가 시작돼도 sticky 안이면 지킨다", () => {
    const current = mapOf(seat(1, "AVAILABLE"));
    const snapshot = mapOf(seat(1, "HOLD"));

    const merged = mergeSeatMapSnapshot({
      current,
      snapshot,
      patchedAtBySeatId: new Map([[1, 100]]),
      fetchStartedAt: 120,
      now: 130,
    });

    expect(merged.seats[0].status).toBe("AVAILABLE");
  });

  it("패치 기록이 없는 칸은 스냅샷 상태를 쓴다", () => {
    const current = mapOf(seat(1, "HOLD"), seat(2, "AVAILABLE"));
    const snapshot = mapOf(seat(1, "AVAILABLE"), seat(2, "HOLD"));

    const merged = mergeSeatMapSnapshot({
      current,
      snapshot,
      patchedAtBySeatId: new Map(),
      fetchStartedAt: 100,
      now: 200,
    });

    expect(merged).toBe(snapshot);
  });

  it("현재 맵이 없으면 스냅샷을 그대로 둔다", () => {
    const snapshot = mapOf(seat(1, "HOLD"));
    expect(
      mergeSeatMapSnapshot({
        current: undefined,
        snapshot,
        patchedAtBySeatId: new Map([[1, 1]]),
        fetchStartedAt: 0,
      }),
    ).toBe(snapshot);
  });
});

describe("tallySeatMapStatuses / seatMapCountsDisagree", () => {
  it("맵 칸 수를 상태별로 센다", () => {
    expect(
      tallySeatMapStatuses(mapOf(seat(1, "AVAILABLE"), seat(2, "HOLD"))),
    ).toEqual({
      availableCount: 1,
      holdCount: 1,
      soldCount: 0,
    });
  });

  it("맵과 seat-counts가 다르면 재조회가 필요하다", () => {
    const map = mapOf(seat(1, "HOLD"), seat(2, "SOLD"));
    expect(seatMapCountsDisagree(map, counts)).toBe(true);
    expect(
      seatMapCountsDisagree(
        mapOf(seat(1, "AVAILABLE"), seat(2, "HOLD")),
        counts,
      ),
    ).toBe(false);
    expect(seatMapCountsDisagree(undefined, counts)).toBe(false);
  });
});

describe("resolveCountsSnapshot / hasProtectedLivePatch", () => {
  it("최근 SSE가 있으면 맵 집계로 숫자를 맞춘다", () => {
    expect(
      resolveCountsSnapshot({
        current: counts,
        snapshot: { ...counts, availableCount: 2, holdCount: 0 },
        preserveCurrent: true,
        map: mapOf(seat(1, "HOLD"), seat(2, "SOLD")),
      }),
    ).toEqual({
      totalCount: 2,
      availableCount: 0,
      holdCount: 1,
      soldCount: 1,
    });
  });

  it("맵이 없으면 캐시 숫자를 유지한다", () => {
    expect(
      resolveCountsSnapshot({
        current: counts,
        snapshot: { ...counts, availableCount: 2, holdCount: 0 },
        preserveCurrent: true,
      }),
    ).toBe(counts);
  });

  it("보호할 패치가 없으면 서버 숫자를 쓴다", () => {
    const snapshot = { ...counts, soldCount: 1, holdCount: 0 };
    expect(
      resolveCountsSnapshot({
        current: counts,
        snapshot,
        preserveCurrent: false,
      }),
    ).toBe(snapshot);
    expect(
      hasProtectedLivePatch(
        new Map([[1, 50]]),
        100,
        50 + SEAT_LIVE_PATCH_STICKY_MS,
      ),
    ).toBe(false);
    expect(hasProtectedLivePatch(new Map([[1, 150]]), 100, 200)).toBe(true);
  });
});
