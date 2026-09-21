import type {
  SeatCounts,
  SeatMapData,
  SeatStatus,
} from "@/types/domain/seat";

const COUNT_KEY: Record<
  SeatStatus,
  keyof Pick<SeatCounts, "availableCount" | "holdCount" | "soldCount">
> = {
  AVAILABLE: "availableCount",
  HOLD: "holdCount",
  SOLD: "soldCount",
};

/** 좌석 한 칸의 상태만 바꿔 맵을 유지한다. 없으면 원본을 그대로 둔다. */
export function patchSeatMapStatus(
  old: SeatMapData | undefined,
  seatId: number,
  status: SeatStatus,
): SeatMapData | undefined {
  if (!old?.seats || !Array.isArray(old.seats)) return old;

  let changed = false;
  const seats = old.seats.map((seat) => {
    if (seat.id !== seatId || seat.status === status) return seat;
    changed = true;
    return { ...seat, status };
  });

  return changed ? { ...old, seats } : old;
}

/** 좌석 상태 이동에 맞춰 seat-counts 숫자를 맞춘다. */
export function applySeatCountDelta(
  counts: SeatCounts,
  from: SeatStatus,
  to: SeatStatus,
): SeatCounts {
  if (from === to) return counts;

  const fromKey = COUNT_KEY[from];
  const toKey = COUNT_KEY[to];

  return {
    ...counts,
    [fromKey]: Math.max(0, counts[fromKey] - 1),
    [toKey]: counts[toKey] + 1,
  };
}

/**
 * from 쪽 카운트가 이미 0이면 이벤트가 비거나 순서가 어긋난 것.
 * 델타 대신 서버 숫자를 다시 받는다.
 */
export function shouldResyncSeatCounts(
  counts: SeatCounts,
  from: SeatStatus,
  to: SeatStatus,
): boolean {
  if (from === to) return false;
  return counts[COUNT_KEY[from]] <= 0;
}

export function findSeatStatus(
  seatMap: SeatMapData | undefined,
  seatId: number,
): SeatStatus | undefined {
  return seatMap?.seats?.find((seat) => seat.id === seatId)?.status;
}

/** 배치가 있고 좌석이 있을 때만, 맵에 없는 좌석을 서버에서 다시 받는다. */
export function shouldRefetchUnknownSeat(
  seatMap: SeatMapData | undefined,
): boolean {
  return Boolean(seatMap?.layoutReady && seatMap.seats?.length);
}

/** 맵이 처음 준비되면, 로드 전에 건너뛴 알림을 숫자로 맞춘다. */
export function shouldResyncCountsOnMapReady(
  hadSeats: boolean,
  nextMap: SeatMapData | undefined,
): boolean {
  return !hadSeats && shouldRefetchUnknownSeat(nextMap);
}
