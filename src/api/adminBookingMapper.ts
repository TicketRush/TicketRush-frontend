import type { AdminBookingItem, AdminBookingStats } from "@/types/domain/admin";
import type { BookingStatus } from "@/types/domain/booking";

/** GET /api/v1/booking/admin/bookings — axios-case-converter 이후 */
export interface BookingAdminSummaryResponse {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  performanceId: number;
  seatId: number;
  bookingStatus: BookingStatus;
  bookedAt: string;
  /** 보강 실패 시 생략 또는 null */
  performanceTitle?: string | null;
  performanceDate?: string | null;
  bookerName?: string | null;
  bookerEmail?: string | null;
  seatNumber?: string | null;
  seatCount?: number;
  /** 미결제(PENDING 등)는 생략 또는 null */
  paymentAmount?: number | null;
}

/** GET /api/v1/booking/admin/bookings/stats — axios-case-converter 이후 */
export interface BookingAdminStatsResponse {
  totalBookings: number;
  completedBookings: number;
  canceledBookings: number;
  totalRevenue: number;
  revenueComplete: boolean;
  missingAmountBookings: number;
}

const EMPTY_STATS: AdminBookingStats = {
  totalBookings: 0,
  completedBookings: 0,
  canceledBookings: 0,
  totalRevenue: 0,
  revenueComplete: true,
  missingAmountBookings: 0,
};

function nullableText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function mapAdminBooking(
  row: BookingAdminSummaryResponse,
): AdminBookingItem {
  const seatNumber = nullableText(row.seatNumber);
  const amount = row.paymentAmount ?? null;

  return {
    bookingId: row.bookingId,
    bookingNumber: row.bookingNumber,
    userId: row.userId,
    performanceId: row.performanceId,
    seatId: row.seatId,
    concertTitle: nullableText(row.performanceTitle),
    concertDate: nullableText(row.performanceDate),
    bookedAt: row.bookedAt,
    userName: nullableText(row.bookerName),
    userEmail: nullableText(row.bookerEmail),
    seatNumbers: seatNumber ? [seatNumber] : [],
    seatCount: row.seatCount ?? 1,
    unitPrice: amount,
    totalAmount: amount,
    status: row.bookingStatus,
  };
}

export function mapAdminBookingStats(
  data: BookingAdminStatsResponse | null | undefined,
): AdminBookingStats {
  if (data == null) return EMPTY_STATS;
  return {
    totalBookings: data.totalBookings,
    completedBookings: data.completedBookings,
    canceledBookings: data.canceledBookings,
    totalRevenue: data.totalRevenue,
    revenueComplete: data.revenueComplete,
    missingAmountBookings: data.missingAmountBookings,
  };
}
