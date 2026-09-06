import type { ConcertStatus } from "@/types/domain/concert";

export type BookingSurface = "list" | "detail";

export interface CanBookConcertParams {
  status: ConcertStatus;
  /** seat-counts 성공 + shouldFetchSeats 포함 여부. 목록(fail-open)에서는 쓰지 않음 */
  seatsReady?: boolean;
  /** 확정된 잔여. null이면 미확정(키 없음) */
  remaining: number | null;
  /**
   * list: ON_SALE + 잔여 0만 막고, 키 없음은 예매하기(fail-open) (#203).
   * detail: ON_SALE + seat-counts 성공 + availableCount > 0 (#181).
   */
  surface?: BookingSurface;
}

/**
 * 목록 CTA / 상세 Sidebar / seats 진입 예매 가능 판정.
 * 기본(detail): ON_SALE + seat-counts 성공 + remaining > 0
 */
export function canBookConcert({
  status,
  seatsReady = false,
  remaining,
  surface = "detail",
}: CanBookConcertParams): boolean {
  if (status !== "ON_SALE") return false;

  if (surface === "list") {
    return remaining !== 0;
  }

  return seatsReady && remaining !== null && remaining > 0;
}

/** ON_SALE일 때만 seat-counts를 조회한다 (#177 / #181). */
export function shouldFetchSeatCounts(status: ConcertStatus): boolean {
  return status === "ON_SALE";
}
