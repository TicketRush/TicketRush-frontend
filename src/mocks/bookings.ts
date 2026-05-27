// src/mocks/bookings.ts
import type { Booking } from "@/types/domain/booking";

/**
 * 회원 예매 내역 Mock 데이터
 *
 * Sprint 9에 실제 API 연동 전까지 useMyBookings에서 사용.
 * 백엔드 API가 준비되면 src/api/booking.ts의 fetchMyBookings만 교체하면 돼.
 *
 * 시연용으로 예정 3건 + 지난 2건 구성 (이미지 3, 4와 동일)
 */
export const MOCK_BOOKINGS: Booking[] = [
  // ─── 예정된 공연 ─────────────────────────────────
  {
    bookingId: "bk_001",
    reservationNumber: "X7B29-KLPW1",
    status: "CONFIRMED",
    concertTitle: "Neon Dreams Concert",
    concertDate: "2026-08-15T19:00:00+09:00",
    venue: "Seoul Arts Center",
    seats: ["A-5", "A-6"],
    totalPrice: 160_000,
    bookedAt: "2026-02-01T14:23:00+09:00",
  },
  {
    bookingId: "bk_002",
    reservationNumber: "RSV-002",
    status: "CONFIRMED",
    concertTitle: "Rock Revolution",
    concertDate: "2026-08-20T20:00:00+09:00",
    venue: "Olympic Hall",
    seats: ["B-3", "B-4", "B-5"],
    totalPrice: 240_000,
    bookedAt: "2026-02-02T10:15:00+09:00",
  },
  {
    bookingId: "bk_003",
    reservationNumber: "RSV-003",
    status: "CONFIRMED",
    concertTitle: "Classical Evening",
    concertDate: "2026-05-25T18:30:00+09:00", // 오늘(5/13)로부터 D-12
    venue: "Concert Hall",
    seats: ["C-1"],
    totalPrice: 80_000,
    bookedAt: "2026-02-03T09:20:00+09:00",
  },

  // ─── 지난 공연 ────────────────────────────────────
  {
    bookingId: "bk_004",
    reservationNumber: "RSV-004",
    status: "CONFIRMED",
    concertTitle: "Jazz Night Special",
    concertDate: "2026-01-20T19:30:00+09:00",
    venue: "Blue Note",
    seats: ["D-8", "D-9"],
    totalPrice: 160_000,
    bookedAt: "2026-01-05T16:45:00+09:00",
  },
  {
    bookingId: "bk_005",
    reservationNumber: "RSV-005",
    status: "CANCELED", // 취소됨
    concertTitle: "Neon Dreams Concert",
    concertDate: "2026-01-10T19:00:00+09:00",
    venue: "Seoul Arts Center",
    seats: ["E-5"],
    totalPrice: 80_000,
    bookedAt: "2025-12-20T11:30:00+09:00",
  },
];
