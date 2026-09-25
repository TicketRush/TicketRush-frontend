import { remainingMsUntil } from "@/utils/booking/parseBackendDateTime";

/** 서버 PENDING 한 건. 내 예매 목록 항목과 분리한다 (#444). */
export interface ServerPendingBooking {
  bookingId: number;
  bookingNumber: string;
  performanceId: number;
  performanceTitle: string;
  performanceVenue: string;
  performanceDate: string;
  seatId: number;
  seatNumber: string;
  price?: number;
  expiresAt?: string | null;
}

/**
 * HOLD와 마감 시각이 남은 임시예매만 고른다.
 * 여러 건이면 마감이 가까운 것을 쓴다. 가격이 없으면 결제 금액이 비므로 제외한다.
 */
export function pickResumablePending(
  items: ServerPendingBooking[],
  nowMs: number = Date.now(),
): ServerPendingBooking | null {
  const open = items.filter((item) => {
    if (!item.bookingNumber) return false;
    if (item.performanceId <= 0 || item.seatId <= 0) return false;
    if (!item.seatNumber.trim()) return false;
    if (item.price == null || item.price <= 0) return false;
    if (!item.expiresAt) return false;
    return remainingMsUntil(item.expiresAt, nowMs) > 0;
  });
  open.sort((a, b) => remainingMsUntil(a.expiresAt!, nowMs) - remainingMsUntil(b.expiresAt!, nowMs));
  return open[0] ?? null;
}
