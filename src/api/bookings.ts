// 예매 API
// swagger 확정: POST /api/v1/booking
// 가상 스펙: 상세 조회, 내 예매 목록, 취소

import type {
  BookingCreateRequest,
  BookingPendingResponse,
  BookingDetail,
  MyBookingsParams,
  MyBookingsResponse,
} from "@/types/domain/booking";
import {
  mockCreateBooking,
  mockGetBookingDetail,
  mockGetMyBookings,
  mockCancelBooking,
} from "./mocks/bookings";
// import apiClient from "./instance";

const USE_MOCK = true;

/** 예매 생성 — swagger 확정: POST /api/v1/booking */
export async function createBookingApi(
  req: BookingCreateRequest,
): Promise<BookingPendingResponse> {
  if (USE_MOCK) return mockCreateBooking(req);
  // const res = await apiClient.post<BookingPendingResponse>(
  //   "/api/v1/booking",
  //   req,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 예매 상세 (가상) */
export async function fetchBookingDetail(
  bookingNumber: string,
): Promise<BookingDetail> {
  if (USE_MOCK) return mockGetBookingDetail(bookingNumber);
  // const res = await apiClient.get<BookingDetail>(
  //   `/api/v1/booking/${bookingNumber}`,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 내 예매 목록 (가상) */
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

/** 예매 취소 (가상) */
export async function cancelBookingApi(bookingNumber: string): Promise<void> {
  if (USE_MOCK) return mockCancelBooking(bookingNumber);
  // await apiClient.post(`/api/v1/booking/${bookingNumber}/cancel`);
  throw new Error("Real API not implemented");
}
