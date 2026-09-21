import { afterEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type {
  SeatCounts,
  SeatMapData,
  SeatWithStatus,
} from "@/types/domain/seat";
import {
  fetchAndMergeSeatMap,
  fetchSeatCountsUnlessLivePatched,
  recordSeatLivePatch,
  resetSeatLivePatchesForTests,
} from "./seatLivePatchTracker";

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

const mapKey = ["seats", "byPerformance", 12] as const;
const countsKey = ["seats", "counts", 12] as const;

const liveMap: SeatMapData = {
  layout: { totalRows: 1, maxCols: 1 },
  layoutReady: true,
  seats: [seat(1, "HOLD")],
};

const staleMap: SeatMapData = {
  layout: { totalRows: 1, maxCols: 1 },
  layoutReady: true,
  seats: [seat(1, "AVAILABLE")],
};

const liveCounts: SeatCounts = {
  totalCount: 1,
  availableCount: 0,
  holdCount: 1,
  soldCount: 0,
};

const staleCounts: SeatCounts = {
  totalCount: 1,
  availableCount: 1,
  holdCount: 0,
  soldCount: 0,
};

afterEach(() => {
  resetSeatLivePatchesForTests();
});

describe("fetchAndMergeSeatMap", () => {
  it("캐시의 SSE HOLD를 늦은 HTTP AVAILABLE이 덮지 않는다", async () => {
    const client = new QueryClient();
    client.setQueryData(mapKey, liveMap);
    recordSeatLivePatch(12, 1);

    const merged = await fetchAndMergeSeatMap(
      client,
      mapKey,
      12,
      async () => staleMap,
    );

    expect(merged.seats[0].status).toBe("HOLD");
  });
});

describe("fetchSeatCountsUnlessLivePatched", () => {
  it("최근 패치가 있으면 늦은 counts 대신 맵 집계를 쓴다", async () => {
    const client = new QueryClient();
    client.setQueryData(mapKey, liveMap);
    client.setQueryData(countsKey, staleCounts);
    recordSeatLivePatch(12, 1);

    const next = await fetchSeatCountsUnlessLivePatched(
      client,
      countsKey,
      12,
      async () => staleCounts,
    );

    expect(next).toEqual(liveCounts);
  });

  it("패치가 없으면 서버 counts를 쓴다", async () => {
    const client = new QueryClient();
    client.setQueryData(countsKey, liveCounts);

    const next = await fetchSeatCountsUnlessLivePatched(
      client,
      countsKey,
      12,
      async () => staleCounts,
    );

    expect(next).toBe(staleCounts);
  });
});
