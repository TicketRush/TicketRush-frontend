// Mock 예매 — 메모리 저장소
//
// 백엔드 booking-service swagger (2026-07-07) 스펙 반영.
//
// 변경 이력:
// - 2026-06-30: BookingCreateRequest → BookingPendingRequest,
//   performanceArtist → performancePerformer, seatLabel → seatNumber
// - 2026-07-15 (이슈 #124):
//   - BookingStatus 값 정정: "CANCELLED" → "CANCELED" (백엔드 스펠링)
//   - venue → venue ?? address fallback (concert.venue optional 대응)

import { mockDelay, mockError } from "./_helpers";
import { parseBackendDateTime } from "@/utils/booking/parseBackendDateTime";
import {
  MY_PAGE_BOOKING_STATUSES,
  type BookingPendingRequest,
  type BookingPendingResponse,
  type BookingDetail,
  type BookingListItem,
  type MyBookingsParams,
  type MyBookingsResponse,
  type BookingStatus,
  type AdminRefundListItem,
  type AdminRefundListParams,
  type AdminRefundStats,
} from "@/types/domain/booking";
import type { AdminBookingBookerResponse } from "../adminSeatMapper";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { nextStatusAfterUserBookingDelete } from "@/utils/booking/userRefund";
import { sumMyPageBookingCounts } from "@/utils/booking";
import {
  filterAdminRefundList,
  summarizeAdminRefunds,
} from "@/utils/admin/adminRefunds";
import {
  MY_BOOKINGS_PAGE_SIZE,
  mergeMyBookingsById,
  pageItems,
} from "@/utils/booking/myBookingsPages";
import { MOCK_CONCERTS } from "./concerts";
import { applyMockSeatHold, mockReleaseSeat } from "./seats";
import samplePoster from "@/assets/images/sample-poster.svg";

const POSTER = samplePoster;

// ── 메모리 저장소 (앱 새로고침 시 초기 데이터로 리셋) ────
const bookingStore: BookingDetail[] = [
  {
    bookingId: 1,
    bookingNumber: "X7B29-KLPW1",
    status: "CONFIRMED",
    performanceId: 1,
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performancePerformer: "BTS",
    performanceVenue: "잠실 올림픽 주경기장",
    performanceDate: "2026-07-20",
    performanceTime: "18:00",
    performanceImageMainUrl: POSTER,
    seatId: 23,
    seatNumber: "B-11",
    price: 132000,
    paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
  },
  {
    bookingId: 2,
    bookingNumber: "A3K91-PQXM2",
    status: "CONFIRMED",
    performanceId: 4,
    performanceTitle: "Jazz Night Live",
    performancePerformer: "나윤선 트리오",
    performanceVenue: "LG아트센터",
    performanceDate: "2026-06-28",
    performanceTime: "20:00",
    performanceImageMainUrl: POSTER,
    seatId: 50,
    seatNumber: "E-2",
    price: 66000,
    paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
  },
  {
    bookingId: 3,
    bookingNumber: "Q8M14-RTYN3",
    // ⚠️ 스펠링 정정: CANCELLED → CANCELED (백엔드 스펙 일치)
    status: "CANCELED",
    performanceId: 3,
    performanceTitle: "Classical Evening: Beethoven Symphony",
    performancePerformer: "서울시향",
    performanceVenue: "예술의전당 콘서트홀",
    performanceDate: "2026-08-10",
    performanceTime: "19:00",
    performanceImageMainUrl: POSTER,
    seatId: 88,
    seatNumber: "H-4",
    price: 55000,
    paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    bookingId: 4,
    bookingNumber: "P9D22-HOLD1",
    status: "PENDING",
    performanceId: 1,
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performancePerformer: "BTS",
    performanceVenue: "잠실 올림픽 주경기장",
    performanceDate: "2026-07-20",
    performanceTime: "18:00",
    performanceImageMainUrl: POSTER,
    seatId: 12,
    seatNumber: "A-12",
    price: 132000,
    paidAt: null,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    cancelledAt: null,
  },
  {
    bookingId: 5,
    bookingNumber: "R7F11-REQ01",
    status: "CONFIRMED",
    performanceId: 1,
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performancePerformer: "BTS",
    performanceVenue: "잠실 올림픽 주경기장",
    performanceDate: "2027-03-15",
    performanceTime: "18:00",
    performanceImageMainUrl: POSTER,
    seatId: 24,
    seatNumber: "B-12",
    price: 132000,
    paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
  },
  {
    bookingId: 6,
    bookingNumber: "F2N88-RFND1",
    status: "REFUNDING",
    performanceId: 1,
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performancePerformer: "BTS",
    performanceVenue: "잠실 올림픽 주경기장",
    performanceDate: "2027-04-10",
    performanceTime: "18:00",
    performanceImageMainUrl: POSTER,
    seatId: 25,
    seatNumber: "B-13",
    price: 132000,
    paidAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
  },
  {
    bookingId: 7,
    bookingNumber: "G4P10-DONE1",
    status: "REFUNDED",
    performanceId: 4,
    performanceTitle: "Jazz Night Live",
    performancePerformer: "나윤선 트리오",
    performanceVenue: "LG아트센터",
    performanceDate: "2026-05-01",
    performanceTime: "20:00",
    performanceImageMainUrl: POSTER,
    seatId: 51,
    seatNumber: "E-3",
    price: 66000,
    paidAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function genBookingNumber(): string {
  const part1 = Math.random().toString(36).substring(2, 7).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${part1}-${part2}`;
}

export async function mockCreateBooking(
  req: BookingPendingRequest,
): Promise<BookingPendingResponse> {
  await mockDelay(400);

  const concert = MOCK_CONCERTS.find((c) => c.id === req.performanceId);
  if (!concert) {
    await mockError("CONCERT_NOT_FOUND", "공연 정보를 찾을 수 없습니다.");
  }

  // 좌석 정보 — seatId에서 seatNumber 파생 (mock_seats와 같은 로직)
  const COLS_CNT = 12;
  const seatId = req.seatId;
  const idx = seatId - 1;
  const rowIdx = Math.floor(idx / COLS_CNT);
  const colIdx = idx % COLS_CNT;
  const rowLetter = String.fromCharCode("A".charCodeAt(0) + rowIdx);
  const seatNumber = `${rowLetter}-${colIdx + 1}`;

  const bookingNumber = genBookingNumber();
  const booking: BookingDetail = {
    bookingId: Date.now(),
    bookingNumber,
    status: "PENDING",
    performanceId: req.performanceId,
    performanceTitle: concert!.title,
    performancePerformer: concert!.performer,
    // venue는 optional (백엔드에 없음) → address fallback
    performanceVenue: concert!.venue ?? concert!.address,
    performanceDate: concert!.showDate,
    performanceTime: concert!.showTime,
    performanceImageMainUrl: concert!.imageMainUrl,
    seatId: req.seatId,
    seatNumber,
    price: concert!.price,
    paidAt: null,
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  };

  applyMockSeatHold(req.performanceId, req.seatId);
  bookingStore.unshift(booking);

  return {
    bookingId: booking.bookingId,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
  };
}

export async function mockGetBookingDetail(
  bookingNumber: string,
): Promise<BookingDetail> {
  await mockDelay(300);
  const booking = bookingStore.find((b) => b.bookingNumber === bookingNumber);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  return booking!;
}

function toBackendDateTime(d: Date): string {
  return d.toISOString();
}

/** GET /booking/{bookingNumber} 의 expires_at — PENDING이면 생성 시각 + 5분 (#168/#246) */
export async function mockFetchPendingBookingExpiresAt(
  bookingNumber: string,
): Promise<string | null> {
  await mockDelay(150);
  const booking = bookingStore.find(
    (b) => b.bookingNumber === bookingNumber && b.status === "PENDING",
  );
  if (!booking) return null;
  const created = parseBackendDateTime(booking.createdAt);
  if (created == null) return null;
  return toBackendDateTime(new Date(created + 5 * 60 * 1000));
}

function toMyBookingListItem(b: BookingDetail): BookingListItem {
  return {
    bookingId: b.bookingId,
    bookingNumber: b.bookingNumber,
    status: b.status,
    performanceTitle: b.performanceTitle,
    performanceVenue: b.performanceVenue,
    performanceDate: b.performanceDate,
    performanceTime: b.performanceTime,
    performanceImageMainUrl: b.performanceImageMainUrl,
    seatNumber: b.seatNumber,
    price: b.price,
    createdAt: b.createdAt,
  };
}

function bookingsOfStatus(status: BookingStatus): BookingDetail[] {
  return bookingStore
    .filter((b) => b.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function mockGetMyBookings(
  params: MyBookingsParams,
): Promise<MyBookingsResponse> {
  await mockDelay(400);

  const page = params.page ?? 0;
  const size = Math.min(params.size ?? MY_BOOKINGS_PAGE_SIZE, MY_BOOKINGS_PAGE_SIZE);

  if (params.status) {
    const paged = pageItems(bookingsOfStatus(params.status), page, size);
    return {
      items: paged.items.map(toMyBookingListItem),
      hasNext: paged.hasNext,
    };
  }

  const batches = MY_PAGE_BOOKING_STATUSES.map((status) =>
    pageItems(bookingsOfStatus(status), page, size),
  );
  const merged = mergeMyBookingsById(
    batches.map((batch) => batch.items),
    (row) => row.bookingId,
    (row) => row.createdAt,
  );

  return {
    items: merged.map(toMyBookingListItem),
    hasNext: batches.some((batch) => batch.hasNext),
  };
}

/** 내 예매 수 조회 — GET /booking/me/count 대응 */
export async function mockGetMyBookingCount(
  status?: BookingStatus,
): Promise<{ count: number }> {
  await mockDelay(200);
  if (status) {
    return {
      count: bookingStore.filter((b) => b.status === status).length,
    };
  }
  const parts = await Promise.all(
    MY_PAGE_BOOKING_STATUSES.map((itemStatus) =>
      mockGetMyBookingCount(itemStatus),
    ),
  );
  return { count: sumMyPageBookingCounts(parts) };
}

export async function mockCancelBooking(bookingNumber: string): Promise<void> {
  await mockDelay(500);
  const booking = bookingStore.find((b) => b.bookingNumber === bookingNumber);
  if (!booking) {
    await mockError(
      ERROR_CODES.BOOKING_NOT_FOUND,
      "예매 정보를 찾을 수 없습니다.",
      0,
      404,
    );
  }
  const next = nextStatusAfterUserBookingDelete(booking!.status);
  if (next == null) {
    await mockError(
      ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED,
      "현재 상태에서는 취소하거나 환불할 수 없습니다.",
      0,
      409,
    );
  }
  if (next === "CANCELED") {
    booking!.status = "CANCELED";
    booking!.cancelledAt = new Date().toISOString();
    await mockReleaseSeat(booking!.performanceId, booking!.seatId);
    return;
  }
  booking!.status = "REFUNDING";
}

/** 결제 confirm 시 booking 상태 업데이트 (mock 내부용) */
export function _updateMockBookingStatus(
  bookingNumber: string,
  status: BookingStatus,
  paidAt?: string,
) {
  const booking = bookingStore.find((b) => b.bookingNumber === bookingNumber);
  if (booking) {
    booking.status = status;
    if (paidAt) booking.paidAt = paidAt;
  }
}

/** bookingNumber로 booking 조회 (mock 내부용) */
export function _findMockBooking(
  bookingNumber: string,
): BookingDetail | undefined {
  return bookingStore.find((b) => b.bookingNumber === bookingNumber);
}

/** bookingId(숫자)로 booking 조회 (mock 내부용) */
export function _findMockBookingById(
  bookingId: number,
): BookingDetail | undefined {
  return bookingStore.find((b) => b.bookingId === bookingId);
}

/** 좌석 ID로 booking 조회 (mock 내부용 — 좌석 모니터링 패널) */
export function _findMockBookingBySeat(
  performanceId: number,
  seatId: number,
): BookingDetail | undefined {
  return bookingStore.find(
    (b) =>
      b.performanceId === performanceId &&
      b.seatId === seatId &&
      (b.status === "PENDING" || b.status === "CONFIRMED"),
  );
}

// ── 관리자: 환불 통합 목록 (mock, #675) ─────────────────
// 진행·완료·미해결 실패만 담는다. 정상 확정·미결제 취소·만료는 없다.
const adminRefundStore: AdminRefundListItem[] = [
  {
    bookingId: 910,
    bookingNumber: "R9S01-PX2N7",
    userId: 8,
    performanceId: 1,
    bookingStatus: "REFUNDING",
    refundStatus: "IN_PROGRESS",
    bookedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    refundFailedAt: null,
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performanceDate: "2027-04-10",
    performanceTime: "18:00:00",
    bookerName: "김철수",
    paymentAmount: 132000,
  },
  {
    bookingId: 902,
    bookingNumber: "R9F02-DONE1",
    userId: 27,
    performanceId: 4,
    bookingStatus: "REFUNDED",
    refundStatus: "COMPLETED",
    bookedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    refundFailedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    performanceTitle: "Jazz Night Live",
    performanceDate: "2026-05-01",
    performanceTime: "20:00:00",
    bookerName: "이영희",
    paymentAmount: 66000,
  },
  {
    bookingId: 901,
    bookingNumber: "R9F01-ZK3Q8",
    userId: 12,
    performanceId: 1,
    bookingStatus: "CONFIRMED",
    refundStatus: "FAILED",
    bookedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    refundFailedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performanceDate: "2026-07-20",
    performanceTime: "18:00:00",
    bookerName: "박민준",
    paymentAmount: 132000,
  },
];

export async function mockGetAdminRefunds(
  params: AdminRefundListParams = {},
): Promise<{ items: AdminRefundListItem[]; hasNext: boolean }> {
  await mockDelay(400);
  const filtered = filterAdminRefundList(
    adminRefundStore,
    params.refundStatus,
  ).sort((a, b) => b.bookingId - a.bookingId);
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const start = page * size;
  return {
    items: filtered.slice(start, start + size),
    hasNext: start + size < filtered.length,
  };
}

export async function mockGetAdminRefundStats(): Promise<AdminRefundStats> {
  await mockDelay(200);
  return summarizeAdminRefunds(adminRefundStore);
}

export async function mockRetryRefund(bookingNumber: string): Promise<void> {
  await mockDelay(500);
  const row = adminRefundStore.find((item) => item.bookingNumber === bookingNumber);
  if (!row) {
    await mockError(
      ERROR_CODES.BOOKING_NOT_FOUND,
      "예매 정보를 찾을 수 없습니다.",
      0,
      404,
    );
  }
  if (row!.refundStatus === "FAILED") {
    row!.bookingStatus = "REFUNDING";
    row!.refundStatus = "IN_PROGRESS";
    return;
  }
  await mockError(
    ERROR_CODES.BOOKING_REFUND_RETRY_NOT_ALLOWED,
    "지금은 환불을 다시 시도할 수 없습니다.",
    0,
    409,
  );
}

/** 사용자 예매 스토어에 없는 관리자 목록 mock을 단건 GET에 붙인다. */
let adminBookerFallback:
  | ((bookingNumber: string) => AdminBookingBookerResponse | undefined)
  | null = null;

export function registerAdminBookerFallback(
  lookup: (bookingNumber: string) => AdminBookingBookerResponse | undefined,
) {
  adminBookerFallback = lookup;
}

export async function mockGetAdminBookingByNumber(
  bookingNumber: string,
): Promise<AdminBookingBookerResponse> {
  await mockDelay(150);
  const booking = _findMockBooking(bookingNumber);
  if (booking) {
    const paid =
      booking.status === "CONFIRMED" ||
      booking.status === "REFUNDED" ||
      booking.status === "REFUNDING";

    return {
      bookingNumber: booking.bookingNumber,
      bookerName: booking.status === "PENDING" ? "예매 진행자" : "김철수",
      bookerEmail: "user@example.com",
      bookedAt: booking.paidAt ?? booking.createdAt,
      bookingStatus: booking.status,
      performanceTitle: booking.performanceTitle,
      performanceDate: booking.performanceDate,
      seatNumber: booking.seatNumber,
      seatCount: 1,
      paymentAmount: paid ? booking.price : null,
    };
  }

  const fromAdminList = adminBookerFallback?.(bookingNumber);
  if (fromAdminList) return fromAdminList;

  return await mockError(
    ERROR_CODES.BOOKING_NOT_FOUND,
    "예매 정보를 찾을 수 없습니다.",
    0,
    404,
  );
}
