// 관리자 API — 전부 가상 스펙 (백엔드 admin API 진행 대기)
import * as mocks from "./mocks/admin";
import type {
  AdminBookingListParams,
  ConcertFormData,
} from "@/types/domain/admin";
// import apiClient from "./instance";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// ── 대시보드 ───────────────────────────────────────────
export async function fetchAdminDashboard() {
  if (USE_MOCK) return mocks.mockGetAdminDashboard();
  // const res = await apiClient.get("/api/v1/admin/dashboard");
  // return res.data;
  throw new Error("Real API not implemented");
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
// #169: 요약 KPI는 seats.ts의 fetchSeatCounts 사용.
//       좌석 맵은 seats.ts의 fetchSeats(seat-layouts) 사용.
//       아래는 레거시 전용 admin monitoring (미사용). 상세/강제해제는 #562.
/** @deprecated #169 — use fetchSeatCounts / fetchSeats instead */
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
  // const res = await apiClient.post("/api/v1/admin/concerts", data);
  // return res.data;
  throw new Error("Real API not implemented");
}

export async function updateConcertApi(id: number, data: ConcertFormData) {
  if (USE_MOCK) return mocks.mockUpdateConcert(id, data);
  // await apiClient.put(`/api/v1/admin/concerts/${id}`, data);
  throw new Error("Real API not implemented");
}

export async function deleteConcertApi(id: number) {
  if (USE_MOCK) return mocks.mockDeleteConcert(id);
  // await apiClient.delete(`/api/v1/admin/concerts/${id}`);
  throw new Error("Real API not implemented");
}

export async function fetchConcertForEdit(id: number) {
  if (USE_MOCK) return mocks.mockGetConcertForEdit(id);
  // const res = await apiClient.get(`/api/v1/admin/concerts/${id}`);
  // return res.data;
  throw new Error("Real API not implemented");
}
