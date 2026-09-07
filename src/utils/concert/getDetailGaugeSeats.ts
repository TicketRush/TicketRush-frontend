import type { ConcertSummary, SeatCounts } from "@/types/domain/concert";
import { hasSeatCounts } from "./hasSeatCounts";

/**
 * 상세 게이지 좌석 수 (#203).
 * 1) 목록 캐시(HOLD 포함 remainingSeats)
 * 2) 없으면 ON_SALE seat-counts: totalCount - soldCount (목록 remaining과 동일)
 * 상세 API 등록값 totalSeats는 쓰지 않는다.
 */
export function getDetailGaugeSeats(
  listItem: ConcertSummary | undefined,
  seatCounts: SeatCounts | undefined,
  seatsReady: boolean,
): { remaining: number | null; total: number } {
  if (listItem && hasSeatCounts(listItem)) {
    return {
      remaining: listItem.remainingSeats,
      total: listItem.totalSeats,
    };
  }

  if (
    seatsReady &&
    seatCounts &&
    typeof seatCounts.totalCount === "number" &&
    typeof seatCounts.soldCount === "number" &&
    seatCounts.totalCount > 0
  ) {
    return {
      remaining: Math.max(0, seatCounts.totalCount - seatCounts.soldCount),
      total: seatCounts.totalCount,
    };
  }

  return { remaining: null, total: 0 };
}
