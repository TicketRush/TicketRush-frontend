import type {
  BookingListItem,
  BookingStatus,
  BookingTab,
} from "@/types/domain/booking";

function toDateOnlyLabel(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * "2026-07-20" + "18:00" / "19:30:00" → Date 객체 (로컬 타임존).
 * 시간이 없으면 해당일 00:00.
 */
export function toShowDateTime(date: string, time?: string): Date {
  const d = date.trim();
  if (!d) return new Date(NaN);
  const t = time?.trim() ?? "";
  if (!t) return new Date(`${d}T00:00:00`);
  const normalized = t.length === 5 ? `${t}:00` : t;
  return new Date(`${d}T${normalized}`);
}

/** 단일 예매 항목이 upcoming인지 past인지 판별 */
export function getBookingTab(
  booking: Pick<BookingListItem, "performanceDate" | "performanceTime">,
  now: Date = new Date(),
): BookingTab {
  const date = booking.performanceDate?.trim() ?? "";
  if (!date) return "past";

  const time = booking.performanceTime?.trim() ?? "";
  if (time) {
    const showAt = toShowDateTime(date, time);
    if (Number.isNaN(showAt.getTime())) return "past";
    return showAt.getTime() >= now.getTime() ? "upcoming" : "past";
  }

  // /booking/me 는 performance_time이 없음 → 공연 날짜만으로 분기 (#168)
  return date >= toDateOnlyLabel(now) ? "upcoming" : "past";
}

/** CONFIRMED만 입장 QR을 조회한다. PENDING·취소·만료는 TICKET_404를 내지 않는다. */
export function canFetchTicketQr(status: BookingStatus): boolean {
  return status === "CONFIRMED";
}

export function bookingQrPlaceholder(status: BookingStatus): string {
  if (status === "PENDING") return "결제 완료 후 입장 QR이 발급됩니다";
  return "입장할 수 없는 예매입니다";
}

export function formatPaymentAmount(
  amount: number | null | undefined,
): string {
  if (amount == null) return "-";
  return `₩${amount.toLocaleString()}`;
}

export function displayBookingText(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : "-";
}

/** 목록을 탭으로 필터링 */
export function filterBookingsByTab(
  bookings: BookingListItem[],
  tab: BookingTab,
  now: Date = new Date(),
): BookingListItem[] {
  return bookings.filter((b) => getBookingTab(b, now) === tab);
}
