// 관리자 API
//
// 대시보드·관리자 공연 목록 (#191 / BE #563):
//   GET /api/v1/performance/admin/dashboard
//   GET /api/v1/performance/admin
// 예매·좌석 모니터링·공연 등록 폼은 가상 경로를 유지한다.

import * as mocks from "./mocks/admin";
import type {
  AdminBookingListParams,
  AdminConcertListParams,
  AdminConcertListResponse,
  AdminDashboardData,
  AdminDashboardParams,
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
export async function fetchAdminBookings(params: AdminBookingListParams) {
  if (USE_MOCK) return mocks.mockGetAdminBookings(params);
  // const res = await apiClient.get("/api/v1/admin/bookings", { params });
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function fetchAdminBookingStats() {
  if (USE_MOCK) return mocks.mockGetAdminBookingStats();
  // const res = await apiClient.get("/api/v1/admin/bookings/stats");
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function adminRefundBookingApi(bookingNumber: string) {
  if (USE_MOCK) return mocks.mockAdminRefundBooking(bookingNumber);
  // await apiClient.post(`/api/v1/admin/bookings/${bookingNumber}/refund`);
  throw new Error("Real API not implemented");
}

// ── 좌석 모니터링 ──────────────────────────────────────
export async function fetchAdminSeatMonitoring(performanceId: number) {
  if (USE_MOCK) return mocks.mockGetAdminSeatMonitoring(performanceId);
  // const res = await apiClient.get(`/api/v1/admin/seats/${performanceId}/monitoring`);
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function fetchAdminSeatDetail(
  performanceId: number,
  seatId: number,
) {
  if (USE_MOCK) return mocks.mockGetAdminSeatDetail(performanceId, seatId);
  // const res = await apiClient.get(`/api/v1/admin/seats/${performanceId}/${seatId}`);
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function adminReleaseSeatApi(
  performanceId: number,
  seatId: number,
) {
  if (USE_MOCK) return mocks.mockAdminReleaseSeat(performanceId, seatId);
  // await apiClient.delete(`/api/v1/admin/seats/${performanceId}/${seatId}/hold`);
  throw new Error("Real API not implemented");
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
