import type { ConcertStatus } from "@/types/domain/concert";

export interface BookingCtaParams {
  status: ConcertStatus;
  /** seat-counts 로딩 중 */
  seatsLoading?: boolean;
  /** seat-counts 실패 */
  seatsError?: boolean;
  /**
   * 확정된 잔여 좌석. null이면 미확정(로딩/실패/미조회).
   * ON_SALE에서만 숫자 의미가 있음.
   */
  remaining: number | null;
}

/**
 * 목록 카드 / 상세 Sidebar 공통 예매 CTA 문구.
 * 활성(disabled)은 호출측 canBook/isOnSale로만 제어한다.
 */
export function getBookingCtaLabel({
  status,
  seatsLoading = false,
  seatsError = false,
  remaining,
}: BookingCtaParams): string {
  if (status === "UPCOMING") return "오픈 예정";
  if (status === "CANCELED") return "공연 취소";
  if (status === "CLOSED") return "예매 마감";

  if (status === "ON_SALE") {
    if (seatsError) return "좌석 정보 확인 불가";
    if (seatsLoading || remaining === null) return "잔여 좌석 확인 중";
    if (remaining === 0) return "매진";
    return "예매하기";
  }

  return "예매 종료";
}
