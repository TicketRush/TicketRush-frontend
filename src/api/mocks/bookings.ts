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
import type {
  BookingPendingRequest,
  BookingPendingResponse,
  BookingDetail,
  BookingListItem,
  MyBookingsParams,
  MyBookingsResponse,
  BookingStatus,
  AdminRefundBookingItem,
  AdminRefundBookingListParams,
  AdminRefundBookingListResponse,
} from "@/types/domain/booking";
import { MOCK_CONCERTS } from "./concerts";
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

export async function mockGetMyBookings(
  params: MyBookingsParams,
): Promise<MyBookingsResponse> {
  await mockDelay(400);

  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const filtered = params.status
    ? bookingStore.filter((b) => b.status === params.status)
    : bookingStore;
  const start = page * size;
  const sliced = filtered.slice(start, start + size);

  const items: BookingListItem[] = sliced.map((b) => ({
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
  }));

  return {
    items,
    hasNext: start + size < filtered.length,
  };
}

/** 내 예매 수 조회 — GET /booking/me/count 대응 */
export async function mockGetMyBookingCount(): Promise<{ count: number }> {
  await mockDelay(200);
  return { count: bookingStore.length };
}

export async function mockCancelBooking(bookingNumber: string): Promise<void> {
  await mockDelay(500);
  const booking = bookingStore.find((b) => b.bookingNumber === bookingNumber);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  // ⚠️ 스펠링 정정: CANCELLED → CANCELED
  if (booking!.status === "CANCELED") {
    await mockError("BOOKING_ALREADY_CANCELED", "이미 취소된 예매입니다.");
  }
  booking!.status = "CANCELED";
  booking!.cancelledAt = new Date().toISOString();
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

// ── 관리자: 환불 모니터링 (mock) ────────────────────────
// 백엔드 GET /booking/admin/bookings/refund-failed, refunding-stuck 흉내.
// 실제 유저 booking 데이터와 별개인 고정 mock 세트 — 데모/개발용.
const MOCK_REFUND_FAILED: AdminRefundBookingItem[] = [
  {
    bookingId: 901,
    bookingNumber: "R9F01-ZK3Q8",
    userId: 12,
    performanceId: 1,
    seatId: 15,
    status: "CANCELED",
    confirmedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    refundFailedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    bookingId: 902,
    bookingNumber: "R9F02-LM8T4",
    userId: 27,
    performanceId: 4,
    seatId: 61,
    status: "CANCELED",
    confirmedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    refundFailedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const MOCK_REFUNDING_STUCK: AdminRefundBookingItem[] = [
  {
    bookingId: 910,
    bookingNumber: "R9S01-PX2N7",
    userId: 8,
    performanceId: 3,
    seatId: 90,
    status: "REFUNDING",
    confirmedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    refundFailedAt: null,
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

async function toAdminRefundListResponse(
  items: AdminRefundBookingItem[],
  params: AdminRefundBookingListParams,
): Promise<AdminRefundBookingListResponse> {
  const size = params.size ?? 20;
  const page = params.page ?? 0;
  const paged = items.slice(page * size, page * size + size);

  const richItems = paged.map((b) => {
    const concert = MOCK_CONCERTS.find((c) => c.id === b.performanceId);
    return {
      ...b,
      performanceTitle: concert?.title ?? "알 수 없는 공연",
      seatNumber: `mock-seat-${b.seatId}`,
    };
  });

  return { items: richItems, hasNext: page * size + size < items.length };
}

export async function mockGetRefundFailedBookings(
  params: AdminRefundBookingListParams,
): Promise<AdminRefundBookingListResponse> {
  await mockDelay(400);
  return toAdminRefundListResponse(MOCK_REFUND_FAILED, params);
}

export async function mockGetRefundingStuckBookings(
  params: AdminRefundBookingListParams,
): Promise<AdminRefundBookingListResponse> {
  await mockDelay(400);
  return toAdminRefundListResponse(MOCK_REFUNDING_STUCK, params);
}

export async function mockRetryRefund(bookingNumber: string): Promise<void> {
  await mockDelay(500);
  const failedIdx = MOCK_REFUND_FAILED.findIndex(
    (b) => b.bookingNumber === bookingNumber,
  );
  if (failedIdx !== -1) {
    // mock: 재시도 성공 시 해당 목록에서 제거
    MOCK_REFUND_FAILED.splice(failedIdx, 1);
    return;
  }

  const stuckIdx = MOCK_REFUNDING_STUCK.findIndex(
    (b) => b.bookingNumber === bookingNumber,
  );
  if (stuckIdx !== -1) {
    MOCK_REFUNDING_STUCK.splice(stuckIdx, 1);
    return;
  }

  await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
}
