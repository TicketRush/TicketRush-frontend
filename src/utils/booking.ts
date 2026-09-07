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
  // 부분 응답으로 날짜가 생략되면 지난 공연으로 단정하지 않는다 (PENDING 결제 건 포함).
  if (!date) return "upcoming";

  const time = booking.performanceTime?.trim() ?? "";
  if (time) {
    const showAt = toShowDateTime(date, time);
    if (Number.isNaN(showAt.getTime())) return "upcoming";
    return showAt.getTime() >= now.getTime() ? "upcoming" : "past";
  }

  // /booking/me 는 performance_time이 없음 → 공연 날짜만으로 분기 (#168)
  return date >= toDateOnlyLabel(now) ? "upcoming" : "past";
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** CONFIRMED이고 공연까지 7일 이상이면 환불 신청 가능. 목록에 시각이 없으면 날짜만 비교한다. */
export function isRefundableBooking(
  booking: Pick<BookingListItem, "performanceDate" | "performanceTime" | "status">,
  now: Date = new Date(),
): boolean {
  if (booking.status !== "CONFIRMED") return false;
  const date = booking.performanceDate?.trim() ?? "";
  if (!date) return false;

  const time = booking.performanceTime?.trim() ?? "";
  if (time) {
    const showAt = toShowDateTime(date, time);
    if (Number.isNaN(showAt.getTime())) return false;
    return (showAt.getTime() - now.getTime()) / MS_PER_DAY >= 7;
  }

  const showDay = toShowDateTime(date);
  const today = toShowDateTime(toDateOnlyLabel(now));
  if (Number.isNaN(showDay.getTime()) || Number.isNaN(today.getTime())) {
    return false;
  }
  return Math.round((showDay.getTime() - today.getTime()) / MS_PER_DAY) >= 7;
}

/** CONFIRMED만 입장 QR을 조회한다. PENDING·취소·만료는 TICKET_404를 내지 않는다. */
export function canFetchTicketQr(status: BookingStatus): boolean {
  return status === "CONFIRMED";
}

export function bookingQrPlaceholder(status: BookingStatus): string {
  if (status === "PENDING") return "결제 완료 후 입장 QR이 발급됩니다";
  return "입장할 수 없는 예매입니다";
}

export function paymentCompleteHeading(status: BookingStatus): {
  title: string;
  subtitle: string;
} {
  if (status === "CONFIRMED") {
    return { title: "결제 완료!", subtitle: "디지털 티켓이 발급되었습니다" };
  }
  if (status === "PENDING") {
    return {
      title: "결제 대기 중",
      subtitle: "결제를 완료하면 디지털 티켓이 발급됩니다",
    };
  }
  return {
    title: "예매를 확인할 수 없습니다",
    subtitle: bookingQrPlaceholder(status),
  };
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
