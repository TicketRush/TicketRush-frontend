import { describe, expect, it } from "vitest";
import type {
  SeatCounts,
  SeatMapData,
  SeatWithStatus,
} from "@/types/domain/seat";
import {
  applySeatCountDelta,
  findSeatStatus,
  patchSeatMapStatus,
  shouldRefetchUnknownSeat,
  shouldResyncCountsOnMapReady,
  shouldResyncSeatCounts,
} from "./applySeatStatusUpdate";

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

const map: SeatMapData = {
  layout: { totalRows: 1, maxCols: 2 },
  layoutReady: true,
  seats: [seat(1, "AVAILABLE"), seat(2, "HOLD")],
};

const counts: SeatCounts = {
  totalCount: 10,
  availableCount: 7,
  holdCount: 2,
  soldCount: 1,
};

describe("patchSeatMapStatus", () => {
  it("해당 좌석 상태만 바꾸고 나머지는 유지한다", () => {
    const next = patchSeatMapStatus(map, 1, "HOLD");
    expect(next?.seats[0].status).toBe("HOLD");
    expect(next?.seats[1].status).toBe("HOLD");
    expect(next?.layoutReady).toBe(true);
  });

  it("같은 상태이거나 좌석이 없으면 원본을 그대로 둔다", () => {
    expect(patchSeatMapStatus(map, 1, "AVAILABLE")).toBe(map);
    expect(patchSeatMapStatus(map, 99, "HOLD")).toBe(map);
    expect(patchSeatMapStatus(undefined, 1, "HOLD")).toBeUndefined();
  });
});

describe("applySeatCountDelta", () => {
  it("AVAILABLE → HOLD 이면 가능 좌석을 줄이고 임시예매를 늘린다", () => {
    expect(applySeatCountDelta(counts, "AVAILABLE", "HOLD")).toEqual({
      totalCount: 10,
      availableCount: 6,
      holdCount: 3,
      soldCount: 1,
    });
  });

  it("HOLD → SOLD, HOLD → AVAILABLE 도 숫자를 맞춘다", () => {
    expect(applySeatCountDelta(counts, "HOLD", "SOLD")).toEqual({
      ...counts,
      holdCount: 1,
      soldCount: 2,
    });
    expect(applySeatCountDelta(counts, "HOLD", "AVAILABLE")).toEqual({
      ...counts,
      availableCount: 8,
      holdCount: 1,
    });
  });

  it("같은 상태면 원본을 두고, 0 아래로 내리지 않는다", () => {
    expect(applySeatCountDelta(counts, "HOLD", "HOLD")).toBe(counts);
    expect(
      applySeatCountDelta({ ...counts, availableCount: 0 }, "AVAILABLE", "HOLD")
        .availableCount,
    ).toBe(0);
  });
});

describe("shouldResyncSeatCounts", () => {
  it("from 카운트가 이미 0이면 서버 재조회가 필요하다", () => {
    expect(
      shouldResyncSeatCounts(
        { ...counts, availableCount: 0 },
        "AVAILABLE",
        "HOLD",
      ),
    ).toBe(true);
  });

  it("정상적인 상태 이동은 재조회하지 않는다", () => {
    expect(shouldResyncSeatCounts(counts, "AVAILABLE", "HOLD")).toBe(false);
    expect(shouldResyncSeatCounts(counts, "HOLD", "HOLD")).toBe(false);
  });
});

describe("findSeatStatus", () => {
  it("맵에서 좌석 상태를 찾는다", () => {
    expect(findSeatStatus(map, 2)).toBe("HOLD");
    expect(findSeatStatus(map, 99)).toBeUndefined();
  });
});

describe("shouldRefetchUnknownSeat", () => {
  it("맵이 준비된 뒤에만 없는 좌석을 재조회한다", () => {
    expect(shouldRefetchUnknownSeat(undefined)).toBe(false);
    expect(shouldRefetchUnknownSeat({ ...map, seats: undefined as never })).toBe(
      false,
    );
    expect(shouldRefetchUnknownSeat(map)).toBe(true);
  });

  it("배치가 없거나 좌석이 비면 재조회하지 않는다", () => {
    expect(
      shouldRefetchUnknownSeat({
        layout: null,
        layoutReady: false,
        seats: [],
      }),
    ).toBe(false);
    expect(shouldRefetchUnknownSeat({ ...map, seats: [] })).toBe(false);
  });
});

describe("shouldResyncCountsOnMapReady", () => {
  it("맵이 처음 준비된 순간에만 숫자를 다시 받는다", () => {
    expect(shouldResyncCountsOnMapReady(false, undefined)).toBe(false);
    expect(shouldResyncCountsOnMapReady(false, map)).toBe(true);
    expect(shouldResyncCountsOnMapReady(true, map)).toBe(false);
    expect(
      shouldResyncCountsOnMapReady(false, {
        layout: null,
        layoutReady: false,
        seats: [],
      }),
    ).toBe(false);
  });
});
