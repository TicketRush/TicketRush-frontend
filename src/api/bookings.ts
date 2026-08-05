// 예매 API — 백엔드 booking-service swagger (2026-06-30) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   createBookingApi     → POST   /api/v1/booking
//   fetchBookingDetail   → 프론트 aggregation (booking + performance + seat 조합, ⚠️ 실 API 없음)
//   fetchMyBookings      → GET    /api/v1/booking/me
//   countMyBookingsApi   → GET    /api/v1/booking/me/count (신규)
//   cancelBookingApi     → DELETE /api/v1/booking/{bookingNumber} (기존 POST → DELETE 변경)

import type {
  BookingPendingRequest,
  BookingPendingResponse,
  BookingDetail,
  MyBookingsParams,
  MyBookingsResponse,
  MyBookingCountResponse,
} from "@/types/domain/booking";
import {
  mockCreateBooking,
  mockGetBookingDetail,
  mockGetMyBookings,
  mockGetMyBookingCount,
  mockCancelBooking,
} from "./mocks/bookings";
// import apiClient from "./instance";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/** 예매 생성 (백엔드 확정: POST /api/v1/booking) */
export async function createBookingApi(
  req: BookingPendingRequest,
): Promise<BookingPendingResponse> {
  if (USE_MOCK) return mockCreateBooking(req);
  // const res = await apiClient.post<BookingPendingResponse>(
  //   "/api/v1/booking",
  //   req,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/**
 * 예매 상세 (프론트 aggregation)
 *
 * ⚠️ 백엔드에 이 API 없음. 실 API 연동 시 다음 조합 필요:
 *   1. GET /api/v1/booking/me 에서 해당 bookingNumber 찾기
 *   2. GET /api/v1/performance/{performanceId} 로 공연 정보 조회
 *   3. seat-service에서 seatNumber 조회
 */
export async function fetchBookingDetail(
  bookingNumber: string,
): Promise<BookingDetail> {
  if (USE_MOCK) return mockGetBookingDetail(bookingNumber);
  throw new Error("Real API not implemented (use aggregation)");
}

/** 내 예매 목록 (백엔드 확정: GET /api/v1/booking/me) */
export async function fetchMyBookings(
  params: MyBookingsParams,
): Promise<MyBookingsResponse> {
  if (USE_MOCK) return mockGetMyBookings(params);
  // const res = await apiClient.get<MyBookingsResponse>(
  //   "/api/v1/booking/me",
  //   { params },
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/**
 * 내 예매 수 조회 (신규 - 백엔드 확정: GET /api/v1/booking/me/count).
 * 마이페이지의 예매 카운트 뱃지 등에 사용.
 */
export async function countMyBookingsApi(): Promise<MyBookingCountResponse> {
  if (USE_MOCK) return mockGetMyBookingCount();
  // const res = await apiClient.get<MyBookingCountResponse>(
  //   "/api/v1/booking/me/count",
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/**
 * 예매 취소 (백엔드 확정: DELETE /api/v1/booking/{bookingNumber}).
 *
 * 기존 프론트 mock은 POST 방식이었으나 백엔드 확정 스펙은 DELETE.
 * 함수 이름은 유지, 실 API 호출 메서드만 DELETE로.
 */
export async function cancelBookingApi(bookingNumber: string): Promise<void> {
  if (USE_MOCK) return mockCancelBooking(bookingNumber);
  // await apiClient.delete(`/api/v1/booking/${bookingNumber}`);
  throw new Error("Real API not implemented");
}
