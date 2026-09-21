import type { SeatCounts, SeatMapData, SeatStatus } from "@/types/domain/seat";

/** HTTP가 SSE보다 늦게 오거나 복제 지연이어도, 방금 패치한 칸을 잠시 지킨다. */
export const SEAT_LIVE_PATCH_STICKY_MS = 10_000;

export function shouldPreserveLiveSeatStatus(
  patchedAt: number | undefined,
  fetchStartedAt: number,
  now: number,
  stickyMs: number = SEAT_LIVE_PATCH_STICKY_MS,
): boolean {
  if (patchedAt == null) return false;
  if (patchedAt >= fetchStartedAt) return true;
  return now - patchedAt < stickyMs;
}

export function mergeSeatMapSnapshot(args: {
  current: SeatMapData | undefined;
  snapshot: SeatMapData;
  patchedAtBySeatId: ReadonlyMap<number, number>;
  fetchStartedAt: number;
  now?: number;
  stickyMs?: number;
}): SeatMapData {
  const {
    current,
    snapshot,
    patchedAtBySeatId,
    fetchStartedAt,
    now = Date.now(),
    stickyMs = SEAT_LIVE_PATCH_STICKY_MS,
  } = args;

  if (!current?.seats?.length) return snapshot;
  if (!snapshot.seats?.length) return snapshot;

  const currentById = new Map(current.seats.map((seat) => [seat.id, seat]));
  let preserved = false;

  const seats = snapshot.seats.map((seat) => {
    const live = currentById.get(seat.id);
    if (
      !live ||
      live.status === seat.status ||
      !shouldPreserveLiveSeatStatus(
        patchedAtBySeatId.get(seat.id),
        fetchStartedAt,
        now,
        stickyMs,
      )
    ) {
      return seat;
    }
    preserved = true;
    return { ...seat, status: live.status };
  });

  return preserved ? { ...snapshot, seats } : snapshot;
}

const COUNT_KEY: Record<
  SeatStatus,
  keyof Pick<SeatCounts, "availableCount" | "holdCount" | "soldCount">
> = {
  AVAILABLE: "availableCount",
  HOLD: "holdCount",
  SOLD: "soldCount",
};

export function tallySeatMapStatuses(
  map: SeatMapData | undefined,
): Pick<SeatCounts, "availableCount" | "holdCount" | "soldCount"> | null {
  if (!map?.layoutReady || !map.seats?.length) return null;

  const tally = {
    availableCount: 0,
    holdCount: 0,
    soldCount: 0,
  };

  for (const seat of map.seats) {
    tally[COUNT_KEY[seat.status]] += 1;
  }

  return tally;
}

/** 맵 칸 수와 seat-counts가 다르면 놓친 SSE가 있을 수 있다. */
export function seatMapCountsDisagree(
  map: SeatMapData | undefined,
  counts: SeatCounts | undefined,
): boolean {
  const tally = tallySeatMapStatuses(map);
  if (!tally || !counts) return false;

  return (
    tally.availableCount !== counts.availableCount ||
    tally.holdCount !== counts.holdCount ||
    tally.soldCount !== counts.soldCount
  );
}

export function resolveCountsSnapshot(args: {
  current: SeatCounts | undefined;
  snapshot: SeatCounts;
  preserveCurrent: boolean;
  map?: SeatMapData;
}): SeatCounts {
  if (!args.preserveCurrent) return args.snapshot;

  const tally = tallySeatMapStatuses(args.map);
  if (tally) {
    return { ...args.snapshot, ...tally };
  }
  if (args.current) return args.current;
  return args.snapshot;
}

export function hasProtectedLivePatch(
  patchedAtBySeatId: ReadonlyMap<number, number>,
  fetchStartedAt: number,
  now: number = Date.now(),
  stickyMs: number = SEAT_LIVE_PATCH_STICKY_MS,
): boolean {
  for (const patchedAt of patchedAtBySeatId.values()) {
    if (
      shouldPreserveLiveSeatStatus(patchedAt, fetchStartedAt, now, stickyMs)
    ) {
      return true;
    }
  }
  return false;
}
