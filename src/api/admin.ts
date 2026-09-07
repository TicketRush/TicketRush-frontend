// 관리자 API
//
// 관리자 API
//
// 대시보드·관리자 공연 목록 (#191 / BE #563):
//   GET /api/v1/performance/admin/dashboard
//   GET /api/v1/performance/admin
// 예매 내역 (#174 / BE #561):
//   GET  /api/v1/booking/admin/bookings
//   GET  /api/v1/booking/admin/bookings/stats
//   POST /api/v1/booking/admin/{bookingNumber}/refund
// 환불 실패·고착 복구(#135)의 refund-retry 는 여기 두지 않는다.
// 좌석 모니터링 (#169 / BE #562):
//   GET    /api/v1/seat/{id}/seat-counts          — KPI 4종 (seats.ts)
//   GET    /api/v1/seat/admin/{id}/monitoring
//   GET    /api/v1/seat/admin/{id}/{seatId}
//   DELETE /api/v1/seat/admin/{id}/{seatId}/hold?bookingNumber=
//   GET    /api/v1/booking/admin/bookings/{bookingNumber} — 예매자 조합

import * as mocks from "./mocks/admin";
import type {
  AdminBookingListParams,
  AdminBookingListResponse,
  AdminBookingStats,
  AdminConcertListParams,
  AdminConcertListResponse,
  AdminDashboardData,
  AdminDashboardParams,
  AdminSeatDetail,
  ConcertFormData,
} from "@/types/domain/admin";
import { isPageInfo } from "./types/pagination";
import { USE_MOCK } from "./useMock";
import apiClient from "./instance";
import {
  mapAdminConcert,
  mapAdminDashboard,
  type PerformanceAdminDashboardResponse,
  type PerformanceAdminSummaryResponse,
} from "./adminDashboardMapper";
import {
  mapAdminBooking,
  mapAdminBookingStats,
  type BookingAdminStatsResponse,
  type BookingAdminSummaryResponse,
} from "./adminBookingMapper";
import {
  mapAdminMonitoringSeats,
  mapAdminSeatDetail,
  type SeatAdminMonitoringResponse,
  type SeatAdminSeatDetailResponse,
} from "./adminSeatMapper";
import type { SeatWithStatus } from "@/types/domain/seat";

// ── 대시보드 ───────────────────────────────────────────
export async function fetchAdminDashboard(
  params: AdminDashboardParams,
): Promise<AdminDashboardData> {
  if (USE_MOCK) return mocks.mockGetAdminDashboard(params);

  const res = await apiClient.get<PerformanceAdminDashboardResponse>(
    "/api/v1/performance/admin/dashboard",
    { params: { from: params.from, to: params.to } },
  );
  if (res.data == null) {
    return mapAdminDashboard({ registeredPerformances: 0 });
  }
  return mapAdminDashboard(res.data);
}

export async function fetchAdminConcerts(
  params: AdminConcertListParams = {},
): Promise<AdminConcertListResponse> {
  if (USE_MOCK) return mocks.mockGetAdminConcerts(params);

  const page = params.page ?? 0;
  const size = Math.min(params.size ?? 10, 50);
  const res = await apiClient.get<PerformanceAdminSummaryResponse[]>(
    "/api/v1/performance/admin",
    { params: { page, size } },
  );
  const pagination =
    res.pagination && isPageInfo(res.pagination)
      ? res.pagination
      : undefined;
  const items = (res.data ?? []).map(mapAdminConcert);

  return {
    items,
    pagination: {
      pageIndex: pagination?.pageIndex ?? page,
      size: pagination?.size ?? size,
      hasNext: pagination?.hasNext ?? false,
      totalElements: pagination?.totalElements ?? items.length,
      totalPages: pagination?.totalPages ?? 1,
    },
  };
}

// ── 예매 내역 ──────────────────────────────────────────
export async function fetchAdminBookings(
  params: AdminBookingListParams = {},
): Promise<AdminBookingListResponse> {
  if (USE_MOCK) return mocks.mockGetAdminBookings(params);

  const page = params.page ?? 0;
  const size = Math.min(params.size ?? 10, 50);
  const res = await apiClient.get<BookingAdminSummaryResponse[]>(
    "/api/v1/booking/admin/bookings",
    { params: { page, size } },
  );
  const pagination =
    res.pagination && isPageInfo(res.pagination)
      ? res.pagination
      : undefined;
  const items = (res.data ?? []).map(mapAdminBooking);

  return {
    items,
    pagination: {
      pageIndex: pagination?.pageIndex ?? page,
      size: pagination?.size ?? size,
      hasNext: pagination?.hasNext ?? false,
      totalElements: pagination?.totalElements ?? items.length,
      totalPages: pagination?.totalPages ?? 1,
    },
  };
}

export async function fetchAdminBookingStats(): Promise<AdminBookingStats> {
  if (USE_MOCK) return mocks.mockGetAdminBookingStats();

  const res = await apiClient.get<BookingAdminStatsResponse>(
    "/api/v1/booking/admin/bookings/stats",
  );
  return mapAdminBookingStats(res.data);
}

export async function adminRefundBookingApi(
  bookingNumber: string,
): Promise<void> {
  if (USE_MOCK) return mocks.mockAdminRefundBooking(bookingNumber);
  await apiClient.post(
    `/api/v1/booking/admin/${encodeURIComponent(bookingNumber)}/refund`,
  );
}

/**
 * 예매 번호가 없는 레거시 HOLD 해제용.
 * BE는 @NotBlank라 쿼리를 비울 수 없고, 좌석의 bookingNumber가 null이면 가드를 건너뛴다.
 */
export const LEGACY_HOLD_BOOKING_NUMBER = "-";

// ── 좌석 모니터링 ──────────────────────────────────────
export async function fetchAdminSeatMonitoring(
  performanceId: number,
): Promise<{ seats: SeatWithStatus[] }> {
  if (USE_MOCK) return mocks.mockGetAdminSeatMonitoring(performanceId);

  const res = await apiClient.get<SeatAdminMonitoringResponse>(
    `/api/v1/seat/admin/${performanceId}/monitoring`,
  );
  if (res.data == null) {
    throw new Error("좌석 정보를 불러올 수 없습니다.");
  }
  return { seats: mapAdminMonitoringSeats(res.data) };
}

export async function fetchAdminSeatDetail(
  performanceId: number,
  seatId: number,
): Promise<AdminSeatDetail> {
  if (USE_MOCK) return mocks.mockGetAdminSeatDetail(performanceId, seatId);

  const res = await apiClient.get<SeatAdminSeatDetailResponse>(
    `/api/v1/seat/admin/${performanceId}/${seatId}`,
  );
  if (res.data == null) {
    throw new Error("좌석 정보를 불러올 수 없습니다.");
  }
  return mapAdminSeatDetail(res.data);
}

export async function adminReleaseSeatApi(
  performanceId: number,
  seatId: number,
  bookingNumber: string,
): Promise<void> {
  if (USE_MOCK) {
    return mocks.mockAdminReleaseSeat(performanceId, seatId, bookingNumber);
  }

  await apiClient.delete(
    `/api/v1/seat/admin/${performanceId}/${seatId}/hold`,
    { params: { bookingNumber } },
  );
}

// ── 공연 CRUD ──────────────────────────────────────────
export async function createConcertApi(data: ConcertFormData) {
  if (USE_MOCK) return mocks.mockCreateConcert(data);
  // const res = await apiClient.post("/api/v1/performance/admin", data);
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function updateConcertApi(id: number, data: ConcertFormData) {
  if (USE_MOCK) return mocks.mockUpdateConcert(id, data);
  // await apiClient.put(`/api/v1/performance/admin/${id}`, data);
  throw new Error("Real API not implemented");
}

export async function deleteConcertApi(id: number) {
  if (USE_MOCK) return mocks.mockDeleteConcert(id);
  // await apiClient.delete(`/api/v1/performance/admin/${id}`);
  throw new Error("Real API not implemented");
}

export async function fetchConcertForEdit(id: number) {
  if (USE_MOCK) return mocks.mockGetConcertForEdit(id);
  // const res = await apiClient.get(`/api/v1/performance/${id}`);
  // return res.data;
  throw new Error("Real API not implemented");
}
