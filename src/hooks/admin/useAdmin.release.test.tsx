import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminKeys, useAdminReleaseSeat } from "./useAdmin";
import { queryKeys } from "@/constants/queryKeys";
import type { SeatCounts, SeatMapData, SeatWithStatus } from "@/types/domain/seat";
import {
  fetchSeatCountsUnlessLivePatched,
  resetSeatLivePatchesForTests,
} from "@/utils/seat/seatLivePatchTracker";

const api = vi.hoisted(() => ({ adminReleaseSeatApi: vi.fn() }));
vi.mock("@/api/admin", () => api);

function seat(status: SeatWithStatus["status"]): SeatWithStatus {
  return {
    id: 1,
    seatLayoutId: 1,
    seatNumber: "A-1",
    row: "A",
    col: 1,
    status,
  };
}

function seatMap(status: SeatWithStatus["status"]): SeatMapData {
  return {
    layout: { totalRows: 1, maxCols: 1 },
    layoutReady: true,
    seats: [seat(status)],
  };
}

const heldCounts: SeatCounts = {
  totalCount: 1,
  availableCount: 0,
  holdCount: 1,
  soldCount: 0,
};

const releasedCounts: SeatCounts = {
  totalCount: 1,
  availableCount: 1,
  holdCount: 0,
  soldCount: 0,
};

const clients: QueryClient[] = [];

beforeEach(() => {
  vi.stubGlobal("React", React);
  api.adminReleaseSeatApi.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  resetSeatLivePatchesForTests();
  vi.unstubAllGlobals();
});

it("해제 성공 시 공개 맵을 AVAILABLE로 맞추고 예매 캐시를 비운다", async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);

  const performanceId = 12;
  const publicKey = queryKeys.seats.byPerformance(performanceId);
  const adminKey = adminKeys.seatMonitoring(performanceId);
  const countsKey = queryKeys.seats.counts(performanceId);
  const bookingsKey = ["admin", "bookings", { page: 0 }] as const;
  const bookingKey = ["admin", "booking", "BK-1"] as const;

  client.setQueryData(publicKey, seatMap("HOLD"));
  client.setQueryData(adminKey, seatMap("HOLD"));
  client.setQueryData(countsKey, heldCounts);
  client.setQueryData(bookingsKey, { items: [{ status: "PENDING" }] });
  client.setQueryData(bookingKey, { bookingNumber: "BK-1", status: "PENDING" });

  let release!: () => Promise<void>;
  function Harness() {
    const mutation = useAdminReleaseSeat(performanceId);
    release = () =>
      mutation.mutateAsync({ seatId: 1, bookingNumber: "BK-1" });
    return null;
  }

  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );

  await release();

  expect(api.adminReleaseSeatApi).toHaveBeenCalledWith(performanceId, 1, "BK-1");
  expect(client.getQueryData<SeatMapData>(publicKey)?.seats[0].status).toBe(
    "AVAILABLE",
  );
  expect(client.getQueryData<SeatMapData>(adminKey)?.seats[0].status).toBe(
    "AVAILABLE",
  );
  expect(client.getQueryData(countsKey)).toEqual(releasedCounts);
  expect(client.getQueryData(bookingKey)).toMatchObject({ status: "PENDING" });
  expect(client.getQueryState(bookingsKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(bookingKey)?.isInvalidated).toBe(true);

  const reconciled = await fetchSeatCountsUnlessLivePatched(
    client,
    countsKey,
    performanceId,
    async () => releasedCounts,
  );
  expect(reconciled).toEqual(releasedCounts);
});
