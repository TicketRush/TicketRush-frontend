import { LEGACY_HOLD_BOOKING_NUMBER } from "@/api/admin";
import { ERROR_CODES } from "@/api/errors/errorCodes";

/**
 * 강제 해제 쿼리의 bookingNumber.
 * 상세에 번호가 없으면 BE @NotBlank를 피하려고 `-`를 보낸다.
 * 좌석의 번호가 null일 때만 선점 가드를 건너뛴다.
 */
export function adminReleaseBookingNumber(bookingNumber?: string): string {
  const trimmed = bookingNumber?.trim();
  return trimmed || LEGACY_HOLD_BOOKING_NUMBER;
}

/** 강제 해제 409 이후 화면이 할 일. 토스트는 mutationCache가 낸다. */
export type AdminSeatReleaseFailure =
  | { kind: "clear-selection" }
  | { kind: "open-refund"; bookingNumber?: string }
  | { kind: "keep-selection" }
  | { kind: "none" };

export function resolveAdminSeatReleaseFailure(
  code: string,
  bookingNumber?: string,
): AdminSeatReleaseFailure {
  const trimmed = bookingNumber?.trim() || undefined;
  if (code === ERROR_CODES.SEAT_NOT_HELD) return { kind: "clear-selection" };
  if (code === ERROR_CODES.SEAT_SOLD_NOT_RELEASABLE) {
    return { kind: "open-refund", bookingNumber: trimmed };
  }
  if (code === ERROR_CODES.SEAT_RELEASE_CONFLICT) {
    return { kind: "keep-selection" };
  }
  return { kind: "none" };
}
