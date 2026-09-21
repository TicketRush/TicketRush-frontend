import type {
  BookingListItem,
  BookingStatus,
  BookingTab,
} from "@/types/domain/booking";
import { formatSeoulDate } from "@/utils/datetime/formatSeoulInstant";

/**
 * 공연 달력(서울) 날짜·시각 → epoch ms.
 * 한국은 DST가 없어 `+09:00`으로 고정한다 (#259).
 */
export function showScheduleToMs(
  date: string,
  time?: string,
): number | null {
  const d = date.trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;

  const t = time?.trim() ?? "";
  const normalized = !t ? "00:00:00" : t.length === 5 ? `${t}:00` : t;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(normalized)) return null;

  const ms = Date.parse(`${d}T${normalized}+09:00`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * "2026-07-20" + "18:00" / "19:30:00" → Date (서울 벽시계 Instant).
 * 시간이 없으면 해당일 서울 00:00.
 */
export function toShowDateTime(date: string, time?: string): Date {
  const ms = showScheduleToMs(date, time);
  return ms == null ? new Date(NaN) : new Date(ms);
}

/** 공연 달력 필드를 표시용 문자열로 (Instant 변환 없음) */
export function formatPerformanceSchedule(
  date: string,
  time?: string,
): string {
  const d = date.trim();
  if (!d) return "-";
  const t = time?.trim() ?? "";
  if (!t) return d;
  return `${d} ${t.length >= 5 ? t.slice(0, 5) : t}`;
}

/** 단일 예매 항목이 upcoming인지 past인지 판별 (서울 달력 기준, #259) */
export function getBookingTab(
  booking: Pick<BookingListItem, "performanceDate" | "performanceTime">,
  now: Date = new Date(),
): BookingTab {
  const date = booking.performanceDate?.trim() ?? "";
  if (!date) return "upcoming";

  const time = booking.performanceTime?.trim() ?? "";
  if (time) {
    const showAt = showScheduleToMs(date, time);
    if (showAt == null) return "upcoming";
    return showAt >= now.getTime() ? "upcoming" : "past";
  }

  const todaySeoul = formatSeoulDate(now.getTime(), "");
  if (!todaySeoul) return "upcoming";
  return date >= todaySeoul ? "upcoming" : "past";
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** CONFIRMED이고 공연까지 7일 이상이면 환불 신청 가능 (#259). */
export function isRefundableBooking(
  booking: Pick<
    BookingListItem,
    "performanceDate" | "performanceTime" | "status"
  >,
  now: Date = new Date(),
): boolean {
  if (booking.status !== "CONFIRMED") return false;
  const date = booking.performanceDate?.trim() ?? "";
  if (!date) return false;

  const time = booking.performanceTime?.trim() ?? "";
  if (time) {
    const showAt = showScheduleToMs(date, time);
    if (showAt == null) return false;
    return (showAt - now.getTime()) / MS_PER_DAY >= 7;
  }

  const todaySeoul = formatSeoulDate(now.getTime(), "");
  if (!todaySeoul) return false;
  const showMs = showScheduleToMs(date);
  const todayMs = showScheduleToMs(todaySeoul);
  if (showMs == null || todayMs == null) return false;
  return Math.round((showMs - todayMs) / MS_PER_DAY) >= 7;
}

/** 마이페이지 뱃지. REFUNDING은 신청 접수 완료로 보여 준다 (#338). */
export function userBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "예매 확정";
    case "PENDING":
      return "결제 대기";
    case "CANCELED":
      return "취소됨";
    case "REFUNDING":
      return "환불 신청 완료";
    case "REFUNDED":
      return "환불 완료";
    case "EXPIRED":
      return "만료됨";
  }
}

export function canFetchTicketQr(status: BookingStatus): boolean {
  return status === "CONFIRMED";
}

export function bookingQrPlaceholder(status: BookingStatus): string {
  if (status === "PENDING") return "결제 완료 후 입장 QR이 발급됩니다";
  if (status === "REFUNDING") return "환불 신청이 완료된 예매입니다";
  if (status === "REFUNDED") return "환불이 완료된 예매입니다";
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

/** 티켓 확인 페이지 헤더. Figma는 CONFIRMED만 그리지만 QR·다운로드와 상태를 맞춘다. */
export function ticketDetailHeading(status: BookingStatus): {
  title: string;
  subtitle: string;
} {
  if (status === "CONFIRMED") {
    return { title: "티켓 확인", subtitle: "티켓 정보를 확인하세요" };
  }
  if (status === "PENDING") {
    return {
      title: "결제 대기 중",
      subtitle: "결제를 완료하면 디지털 티켓이 발급됩니다",
    };
  }
  if (status === "REFUNDING") {
    return {
      title: "환불 신청 완료",
      subtitle: "환불이 처리되면 예매 상태가 업데이트됩니다",
    };
  }
  if (status === "REFUNDED") {
    return {
      title: "환불 완료",
      subtitle: "이 예매로는 입장 QR을 사용할 수 없습니다",
    };
  }
  return {
    title: "입장할 수 없는 예매입니다",
    subtitle: "이 예매로는 입장 QR을 사용할 수 없습니다",
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

export function filterBookingsByTab(
  bookings: BookingListItem[],
  tab: BookingTab,
  now: Date = new Date(),
): BookingListItem[] {
  return bookings.filter((b) => getBookingTab(b, now) === tab);
}
