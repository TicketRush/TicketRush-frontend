import { fetchBookingDetail, fetchMyPendingForResume } from "@/api/bookings";
import { fetchConcertDetail } from "@/api/concerts";
import {
  pickResumablePending,
  type ServerPendingBooking,
} from "@/utils/booking/pickResumablePending";
import { remainingMsUntil } from "@/utils/booking/parseBackendDateTime";

export interface ResumablePending extends ServerPendingBooking {
  price: number;
  expiresAt: string;
  performanceTime: string;
}

/**
 * 세션이 없는 탭에서 서버 PENDING을 이어가기 후보로 고른다 (#444).
 * 목록 조회가 실패하면 호출부가 배너를 띄우지 않는다.
 */
export async function loadResumablePending(
  nowMs: number = Date.now(),
): Promise<ResumablePending | null> {
  const rows = await fetchMyPendingForResume();
  const times = new Map<string, string>();
  const priced: ServerPendingBooking[] = [];

  for (const row of rows) {
    if (!row.expiresAt || remainingMsUntil(row.expiresAt, nowMs) <= 0) continue;
    let price = row.price;
    let showTime = row.performanceTime;
    let showDate = row.performanceDate;
    let venue = row.performanceVenue;
    let title = row.performanceTitle;
    if (price == null || price <= 0) {
      try {
        const concert = await fetchConcertDetail(row.performanceId);
        price = concert.price;
        showTime = showTime || concert.showTime;
        showDate = showDate || concert.showDate;
        venue = venue || concert.venue || concert.address;
        title = title || concert.title;
      } catch {
        continue;
      }
    }
    times.set(row.bookingNumber, showTime);
    priced.push({
      ...row,
      price,
      performanceDate: showDate,
      performanceVenue: venue,
      performanceTitle: title,
    });
  }

  const picked = pickResumablePending(priced, nowMs);
  if (!picked?.expiresAt || picked.price == null) return null;

  let detail;
  try {
    detail = await fetchBookingDetail(picked.bookingNumber);
  } catch {
    return null;
  }
  if (detail.status !== "PENDING") return null;
  const expiresAt = detail.expiresAt ?? picked.expiresAt;
  if (remainingMsUntil(expiresAt, nowMs) <= 0) return null;
  const price = detail.price ?? picked.price;
  if (price <= 0) return null;

  return {
    ...picked,
    bookingId: detail.bookingId,
    performanceId: detail.performanceId,
    seatId: detail.seatId,
    seatNumber: detail.seatNumber || picked.seatNumber,
    performanceTitle: detail.performanceTitle || picked.performanceTitle,
    performanceVenue: detail.performanceVenue || picked.performanceVenue,
    performanceDate: detail.performanceDate || picked.performanceDate,
    price,
    expiresAt,
    performanceTime: detail.performanceTime || times.get(picked.bookingNumber) || "",
  };
}
