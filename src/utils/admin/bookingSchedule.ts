import type { ConcertStatus } from "@/types/domain/concert";

export function isBookingOpened(status?: ConcertStatus): boolean {
  return status === "ON_SALE" || status === "CLOSED";
}

export function isBookingScheduleLocked(status?: ConcertStatus): boolean {
  // Cancellation does not prove a previous opening, but must not reopen booking.
  return isBookingOpened(status) || status === "CANCELED";
}
