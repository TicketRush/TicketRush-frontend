import type { BookingListItem, BookingTab } from "@/types/domain/booking";

/**
 * "2026-07-20" + "18:00" → Date 객체
 * (로컬 타임존 기준. 백엔드가 ISO로 주면 그대로 new Date()에 넣어도 됨)
 */
export function toShowDateTime(date: string, time: string): Date {
  // "2026-07-20T18:00" 형태로 합쳐 로컬 시각으로 파싱
  return new Date(`${date}T${time}`);
}

/** 단일 예매 항목이 upcoming인지 past인지 판별 */
export function getBookingTab(
  booking: Pick<BookingListItem, "performanceDate" | "performanceTime">,
  now: Date = new Date(),
): BookingTab {
  const showAt = toShowDateTime(
    booking.performanceDate,
    booking.performanceTime,
  );
  // 시작 정각 == 현재 → upcoming (정의: 19:30:00 == 19:30:00 → UPCOMING)
  return showAt.getTime() >= now.getTime() ? "upcoming" : "past";
}

/** 목록을 탭으로 필터링 */
export function filterBookingsByTab(
  bookings: BookingListItem[],
  tab: BookingTab,
  now: Date = new Date(),
): BookingListItem[] {
  return bookings.filter((b) => getBookingTab(b, now) === tab);
}
