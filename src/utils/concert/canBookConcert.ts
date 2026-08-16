import type { ConcertStatus } from "@/types/domain/concert";

export interface CanBookConcertParams {
  status: ConcertStatus;
  /** seat-counts 성공 + shouldFetchSeats 포함 여부 */
  seatsReady: boolean;
  /** 확정된 잔여. null이면 미확정 */
  remaining: number | null;
}

/**
 * 목록 CTA / 상세 Sidebar / seats 진입 공통 예매 가능 판정.
 * ON_SALE + seat-counts 성공 + remaining > 0
 */
export function canBookConcert({
  status,
  seatsReady,
  remaining,
}: CanBookConcertParams): boolean {
  return (
    seatsReady &&
    status === "ON_SALE" &&
    remaining !== null &&
    remaining > 0
  );
}

/** ON_SALE일 때만 seat-counts를 조회한다 (#177 / #181). */
export function shouldFetchSeatCounts(status: ConcertStatus): boolean {
  return status === "ON_SALE";
}
