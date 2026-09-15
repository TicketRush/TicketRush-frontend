import type { AdminSeatDetail } from "@/types/domain/admin";
import type { BookingStatus } from "@/types/domain/booking";
import type { SeatStatus, SeatWithStatus } from "@/types/domain/seat";
import { formatAdminBooker } from "@/utils/admin/formatAdminMetric";
import { safeParseSeatNumber } from "@/utils/seat/parseSeatNumber";

/** GET /api/v1/seat/admin/{id}/monitoring — axios-case-converter 이후 */
export interface SeatAdminMonitoringResponse {
  summary?: {
    totalCount: number;
    availableCount: number;
    soldCount: number;
    holdCount: number;
  };
  seats?: SeatAdminMapItemResponse[];
}

export interface SeatAdminMapItemResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  /** HOLD가 아니면 NON_NULL로 생략 */
  holdExpiredAt?: string;
}

/** GET /api/v1/seat/admin/{id}/{seatId} — axios-case-converter 이후 */
export interface SeatAdminSeatDetailResponse {
  seatId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  /** NON_NULL — 예매 번호 없는 HOLD는 생략 */
  bookingNumber?: string;
  holdStartedAt?: string;
  holdExpiredAt?: string;
  remainingSeconds?: number;
}

/**
 * GET /api/v1/booking/admin/bookings/{bookingNumber}
 * 보강 필드(이름·이메일·공연·좌석)는 장애 시 키 생략.
 */
export interface AdminBookingBookerResponse {
  bookingNumber: string;
  bookerName?: string | null;
  bookerEmail?: string | null;
  bookedAt?: string;
  bookingStatus?: BookingStatus;
  performanceTitle?: string | null;
  performanceDate?: string | null;
  seatNumber?: string | null;
  seatCount?: number;
  paymentAmount?: number | null;
}

export function mapAdminMonitoringSeats(
  data: SeatAdminMonitoringResponse | null | undefined,
): SeatWithStatus[] {
  return (data?.seats ?? []).map(mapAdminSeatMapItem);
}

export function mapAdminSeatMapItem(
  item: SeatAdminMapItemResponse,
): SeatWithStatus {
  const parsed = safeParseSeatNumber(item.seatNumber);
  return {
    id: item.seatId,
    seatLayoutId: item.seatLayoutId,
    seatNumber: item.seatNumber,
    row: parsed.row,
    col: parsed.col,
    status: item.seatStatus,
  };
}

export function mapAdminSeatDetail(
  data: SeatAdminSeatDetailResponse,
): AdminSeatDetail {
  const bookingNumber = data.bookingNumber?.trim();
  const isHold = data.seatStatus === "HOLD";

  return {
    seatId: data.seatId,
    seatNumber: data.seatNumber,
    status: data.seatStatus,
    bookingNumber: bookingNumber || undefined,
    reservedAt: isHold ? data.holdStartedAt : undefined,
    holdRemainingSec: isHold ? (data.remainingSeconds ?? 0) : undefined,
  };
}

export function mergeAdminSeatDetailWithBooker(
  seat: AdminSeatDetail,
  booker: AdminBookingBookerResponse | null | undefined,
): AdminSeatDetail {
  if (booker == null) return seat;

  return {
    ...seat,
    bookerLoadFailed: false,
    reservedBy: formatAdminBooker(booker.bookerName, booker.bookerEmail),
    reservedAt: seat.reservedAt ?? booker.bookedAt,
  };
}

export function markAdminSeatBookerLoadFailed(
  seat: AdminSeatDetail,
): AdminSeatDetail {
  return { ...seat, bookerLoadFailed: true };
}
