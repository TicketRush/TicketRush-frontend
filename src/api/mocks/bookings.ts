// Mock 예매 — 메모리 저장소
import { mockDelay, mockError } from "./_helpers";
import type {
  BookingCreateRequest,
  BookingPendingResponse,
  BookingDetail,
  BookingListItem,
  MyBookingsParams,
  MyBookingsResponse,
  BookingStatus,
} from "@/types/domain/booking";
import { MOCK_CONCERTS } from "./concerts";

const POSTER = "/placeholder-poster.png";

// ── 메모리 저장소 (앱 새로고침 시 초기 데이터로 리셋) ────
const bookingStore: BookingDetail[] = [
  {
    bookingId: 1,
    bookingNumber: "X7B29-KLPW1",
    status: "CONFIRMED",
    performanceId: 1,
    performanceTitle: "BTS World Tour: Beyond the Stars",
    performanceArtist: "BTS",
    performanceVenue: "잠실 올림픽 주경기장",
    performanceDate: "2026-07-20",
    performanceTime: "18:00",
    performancePosterUrl: POSTER,
    seatId: 23,
    seatLabel: "B-11",
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
    performanceArtist: "나윤선 트리오",
    performanceVenue: "LG아트센터",
    performanceDate: "2026-06-28",
    performanceTime: "20:00",
    performancePosterUrl: POSTER,
    seatId: 50,
    seatLabel: "E-2",
    price: 66000,
    paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
  },
  {
    bookingId: 3,
    bookingNumber: "Q8M14-RTYN3",
    status: "CANCELLED",
    performanceId: 3,
    performanceTitle: "Classical Evening: Beethoven Symphony",
    performanceArtist: "서울시향",
    performanceVenue: "예술의전당 콘서트홀",
    performanceDate: "2026-08-10",
    performanceTime: "19:00",
    performancePosterUrl: POSTER,
    seatId: 88,
    seatLabel: "H-4",
    price: 55000,
    paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function genBookingNumber(): string {
  const part1 = Math.random().toString(36).substring(2, 7).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${part1}-${part2}`;
}

export async function mockCreateBooking(
  req: BookingCreateRequest,
): Promise<BookingPendingResponse> {
  await mockDelay(400);

  const concert = MOCK_CONCERTS.find((c) => c.id === req.performanceId);
  if (!concert) {
    await mockError("CONCERT_NOT_FOUND", "공연 정보를 찾을 수 없습니다.");
  }

  // 좌석 정보 — mock seats와 같은 로직 (앞열일수록 비쌈)
  const COLS_CNT = 12;
  const seatId = req.seatId;
  const idx = seatId - 1;
  const rowIdx = Math.floor(idx / COLS_CNT);
  const colIdx = idx % COLS_CNT;
  const rowLetter = String.fromCharCode("A".charCodeAt(0) + rowIdx);
  const seatLabel = `${rowLetter}-${colIdx + 1}`;
  const price = 50000 + rowIdx * 10000;

  const bookingNumber = genBookingNumber();
  const booking: BookingDetail = {
    bookingId: Date.now(),
    bookingNumber,
    status: "PENDING",
    performanceId: req.performanceId,
    performanceTitle: concert!.title,
    performanceArtist: concert!.artist,
    performanceVenue: concert!.venue,
    performanceDate: concert!.date,
    performanceTime: concert!.time,
    performancePosterUrl: concert!.posterUrl,
    seatId: req.seatId,
    seatLabel,
    price,
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

  const size = params.size ?? 100;
  const sliced = bookingStore.slice(0, size);

  const items: BookingListItem[] = sliced.map((b) => ({
    bookingId: b.bookingId,
    bookingNumber: b.bookingNumber,
    status: b.status,
    performanceTitle: b.performanceTitle,
    performanceVenue: b.performanceVenue,
    performanceDate: b.performanceDate,
    performanceTime: b.performanceTime,
    performancePosterUrl: b.performancePosterUrl,
    seatLabel: b.seatLabel,
    price: b.price,
    createdAt: b.createdAt,
  }));

  return {
    items,
    hasNext: bookingStore.length > size,
  };
}

export async function mockCancelBooking(bookingNumber: string): Promise<void> {
  await mockDelay(500);
  const booking = bookingStore.find((b) => b.bookingNumber === bookingNumber);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  if (booking!.status === "CANCELLED") {
    await mockError("BOOKING_ALREADY_CANCELLED", "이미 취소된 예매입니다.");
  }
  booking!.status = "CANCELLED";
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

/** booking detail 직접 조회 (mock 내부용) */
export function _findMockBooking(
  bookingNumber: string,
): BookingDetail | undefined {
  return bookingStore.find((b) => b.bookingNumber === bookingNumber);
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
