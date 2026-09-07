import type { BookingStatus } from "@/types/domain/booking";

/** #169 좌석 모니터링 → 예매 내역 쿼리. 목록 API 검색은 없다. */
export type AdminBookingHandoff = {
  bookingNumber: string;
  intentRefund: boolean;
};

export type AdminBookingHandoffResult = {
  expandBookingNumber: string | null;
  refundTarget: string | null;
  refundBlocked: boolean;
};

type HandoffBooking = {
  bookingNumber: string;
  status: BookingStatus;
};

export function parseAdminBookingHandoff(
  searchParams: Pick<URLSearchParams, "get">,
): AdminBookingHandoff | null {
  const bookingNumber = searchParams.get("bookingNumber")?.trim() ?? "";
  if (!bookingNumber) return null;
  return {
    bookingNumber,
    intentRefund: searchParams.get("intent") === "refund",
  };
}

export function resolveAdminBookingHandoff(
  handoff: AdminBookingHandoff,
  items: readonly HandoffBooking[] | undefined,
): AdminBookingHandoffResult {
  const match = items?.find(
    (item) => item.bookingNumber === handoff.bookingNumber,
  );
  const expandBookingNumber = match?.bookingNumber ?? null;

  if (!handoff.intentRefund) {
    return {
      expandBookingNumber,
      refundTarget: null,
      refundBlocked: false,
    };
  }

  if (match && match.status !== "CONFIRMED") {
    return {
      expandBookingNumber,
      refundTarget: null,
      refundBlocked: true,
    };
  }

  return {
    expandBookingNumber,
    refundTarget: handoff.bookingNumber,
    refundBlocked: false,
  };
}
