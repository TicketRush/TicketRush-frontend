import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { SeatCounts, SeatMapData } from "@/types/domain/seat";
import { queryKeys } from "@/constants/queryKeys";
import {
  hasProtectedLivePatch,
  mergeSeatMapSnapshot,
  resolveCountsSnapshot,
} from "@/utils/seat/seatMapLiveMerge";

/** useAdmin.adminKeys.seatMonitoring 과 동일. hooks를 utils에서 import하지 않기 위해 복제. */
function adminSeatMonitoringKey(performanceId: number) {
  return ["admin", "seat-monitoring", performanceId] as const;
}

function getCachedSeatMap(
  client: QueryClient,
  performanceId: number,
): SeatMapData | undefined {
  const publicMap = client.getQueryData<SeatMapData>(
    queryKeys.seats.byPerformance(performanceId),
  );
  if (publicMap?.layoutReady && publicMap.seats?.length) return publicMap;

  const adminMap = client.getQueryData<SeatMapData>(
    adminSeatMonitoringKey(performanceId),
  );
  if (adminMap?.layoutReady && adminMap.seats?.length) return adminMap;

  return publicMap ?? adminMap;
}

/** 느린 HTTP가 끝나기 전까지 in-flight 워터마크를 남긴다. */
const SEAT_LIVE_PATCH_TTL_MS = 60_000;

const EMPTY_PATCHES: ReadonlyMap<number, number> = new Map();
const patchesByPerformance = new Map<number, Map<number, number>>();

function prunePatches(seats: Map<number, number>, now: number) {
  for (const [seatId, patchedAt] of seats) {
    if (now - patchedAt > SEAT_LIVE_PATCH_TTL_MS) {
      seats.delete(seatId);
    }
  }
}

export function recordSeatLivePatch(
  performanceId: number,
  seatId: number,
  at: number = Date.now(),
) {
  let seats = patchesByPerformance.get(performanceId);
  if (!seats) {
    seats = new Map();
    patchesByPerformance.set(performanceId, seats);
  }
  prunePatches(seats, at);
  seats.set(seatId, at);
}

export function getSeatLivePatches(
  performanceId: number,
): ReadonlyMap<number, number> {
  return patchesByPerformance.get(performanceId) ?? EMPTY_PATCHES;
}

export function resetSeatLivePatchesForTests() {
  patchesByPerformance.clear();
}

export async function fetchAndMergeSeatMap(
  client: QueryClient,
  queryKey: QueryKey,
  performanceId: number,
  fetchSnapshot: () => Promise<SeatMapData>,
): Promise<SeatMapData> {
  const fetchStartedAt = Date.now();
  const snapshot = await fetchSnapshot();
  return mergeSeatMapSnapshot({
    current: client.getQueryData<SeatMapData>(queryKey),
    snapshot,
    patchedAtBySeatId: getSeatLivePatches(performanceId),
    fetchStartedAt,
  });
}

export async function fetchSeatCountsUnlessLivePatched(
  client: QueryClient,
  queryKey: QueryKey,
  performanceId: number,
  fetchSnapshot: () => Promise<SeatCounts>,
): Promise<SeatCounts> {
  const fetchStartedAt = Date.now();
  const snapshot = await fetchSnapshot();
  return resolveCountsSnapshot({
    current: client.getQueryData<SeatCounts>(queryKey),
    snapshot,
    map: getCachedSeatMap(client, performanceId),
    preserveCurrent: hasProtectedLivePatch(
      getSeatLivePatches(performanceId),
      fetchStartedAt,
    ),
  });
}
