// 관리자 API
//
// 대시보드·관리자 공연 목록 (#191 / BE #563):
//   GET    /api/v1/performance/admin/dashboard
//   GET    /api/v1/performance/admin
//   DELETE /api/v1/performance/admin/{id}  — 논리 삭제 (#342)
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
import { fetchConcertDetail } from "./concerts";
import { createPerformancePatch, createConcertReplacementFiles, mapConcertForEdit, type UpdateConcertInput } from "./adminConcertEdit";
import {
  createConcertFormData,
  type CreateConcertInput,
} from "./adminConcertCreate";
import type {
  AdminBookingListParams,
  AdminBookingListResponse,
  AdminBookingStats,
  AdminConcertListParams,
  AdminConcertListResponse,
  AdminDashboardData,
  AdminDashboardParams,
  AdminSeatDetail,
} from "@/types/domain/admin";
import type { BookingStatus } from "@/types/domain/booking";
import {
  adminBookingServerFilterApplied,
  adminBookingTabStatuses,
  type AdminBookingListTab,
} from "@/utils/admin/adminBookingTabs";
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
  mapAdminMonitoring,
  mapAdminSeatDetail,
  type SeatAdminMonitoringResponse,
  type SeatAdminSeatDetailResponse,
} from "./adminSeatMapper";
import type { SeatMapData } from "@/types/domain/seat";

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
  signal?: AbortSignal,
): Promise<AdminConcertListResponse> {
  if (USE_MOCK) return mocks.mockGetAdminConcerts(params);

  const page = params.page ?? 0;
  const size = Math.min(params.size ?? 10, 50);
  const res = await apiClient.get<PerformanceAdminSummaryResponse[]>(
    "/api/v1/performance/admin",
    { params: { page, size }, signal },
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
function normalizeAdminBookingStatuses(
  status: AdminBookingListParams["status"],
): BookingStatus[] {
  if (status == null) return [];
  const list = Array.isArray(status) ? status : [status];
  return Array.from(new Set(list));
}

export async function fetchAdminBookings(
  params: AdminBookingListParams = {},
): Promise<AdminBookingListResponse> {
  if (USE_MOCK) return mocks.mockGetAdminBookings(params);

  const page = params.page ?? 0;
  const size = Math.min(params.size ?? 10, 50);
  const statuses = normalizeAdminBookingStatuses(params.status);
  const res = await apiClient.get<BookingAdminSummaryResponse[]>(
    "/api/v1/booking/admin/bookings",
    {
      params: {
        page,
        size,
        ...(statuses.length > 0 ? { status: statuses } : {}),
      },
      // Spring 반복 파라미터: status=A&status=B (#674). seatIds와 동일.
      paramsSerializer: { indexes: null },
    },
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

const CLIENT_FILTER_PAGE_SIZE = 50;
const CLIENT_FILTER_MAX_PAGES = 40;

/**
 * 탭별 예매 목록.
 * BE #674가 배포된 서버는 status 합집합으로 페이지를 맞춘다.
 * 그 이전 실서버는 status를 무시하므로, 건수가 전체와 같으면 받아 온 목록을 탭으로 거른다.
 */
export async function fetchAdminBookingsForTab(
  tab: AdminBookingListTab,
  params: { page?: number; size?: number } = {},
): Promise<AdminBookingListResponse> {
  const page = params.page ?? 0;
  const size = Math.min(params.size ?? 10, 50);
  const statuses = adminBookingTabStatuses(tab);
  const filtered = await fetchAdminBookings({ page, size, status: statuses });
  const probe = await fetchAdminBookings({ page: 0, size: 1 });
  const applied = adminBookingServerFilterApplied(
    statuses,
    filtered.items,
    filtered.pagination.totalElements,
    probe.pagination.totalElements,
  );
  if (applied) return filtered;
  return collectBookingsForStatuses(statuses, page, size);
}

async function collectBookingsForStatuses(
  statuses: readonly BookingStatus[],
  page: number,
  size: number,
): Promise<AdminBookingListResponse> {
  const matched: AdminBookingListResponse["items"] = [];
  let serverPage = 0;
  let hasNext = true;
  while (hasNext && serverPage < CLIENT_FILTER_MAX_PAGES) {
    const batch = await fetchAdminBookings({
      page: serverPage,
      size: CLIENT_FILTER_PAGE_SIZE,
    });
    for (const item of batch.items) {
      if (statuses.includes(item.status)) matched.push(item);
    }
    hasNext = batch.pagination.hasNext && batch.items.length > 0;
    serverPage += 1;
  }
  const start = page * size;
  const totalElements = matched.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size) || 1);
  return {
    items: matched.slice(start, start + size),
    pagination: {
      pageIndex: page,
      size,
      totalElements,
      totalPages,
      hasNext: start + size < totalElements,
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
): Promise<SeatMapData> {
  if (USE_MOCK) return mocks.mockGetAdminSeatMonitoring(performanceId);

  const res = await apiClient.get<SeatAdminMonitoringResponse>(
    `/api/v1/seat/admin/${performanceId}/monitoring`,
  );
  if (res.data == null) {
    throw new Error("좌석 정보를 불러올 수 없습니다.");
  }
  return mapAdminMonitoring(res.data);
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
export async function createConcertApi(input: CreateConcertInput) {
  const data = createConcertFormData(input);
  if (USE_MOCK) return mocks.mockCreateConcert(input.form);
  const res = await apiClient.post<{ performanceId: number }>(
    "/api/v1/performance/admin",
    data,
    {
      // JSON Blob is already snake_case; character_config keys are opaque.
      // Skip FormData key conversion: mainImage/model3d/gallery are literal part names.
      // Keep the existing auth and response interceptors.
      transformRequest: [(body) => body],
    },
  );
  return res.data;
}

export async function updateConcertApi(id: number, input: UpdateConcertInput) {
  const payload = createPerformancePatch(input);
  const files = createConcertReplacementFiles(input);
  const hasInfoChanges = Object.values(payload).some((value) => value !== undefined);
  if (USE_MOCK) return mocks.mockUpdateConcert(id, input.form);
  if (hasInfoChanges) await apiClient.patch(`/api/v1/performance/admin/${id}`, JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    // Explicit wire mapping preserves character_config's opaque keys.
    transformRequest: [(body) => body],
  });
  if (files) {
    try {
      const res = await apiClient.patch<{
        imageMainUrl: string;
        image3dUrl?: string;
        imageGalleryUrls: string[];
      }>(`/api/v1/performance/admin/${id}/files`, files, {
        transformRequest: [(body) => body],
      });
      if (!res.data) {
        throw new Error("선택한 파일의 교체 결과를 확인할 수 없습니다.");
      }
    } catch (error) {
      const message = hasInfoChanges
        ? "공연 정보는 저장됐지만 파일 교체에 실패했습니다."
        : "파일 교체에 실패했습니다.";
      throw new Error(`${message} ${error instanceof Error ? error.message : "다시 시도해주세요."}`);
    }
  }
}

export async function deleteConcertApi(id: number) {
  if (USE_MOCK) return mocks.mockDeleteConcert(id);
  await apiClient.delete(`/api/v1/performance/admin/${id}`);
}

export async function fetchConcertForEdit(id: number) {
  return mapConcertForEdit(await fetchConcertDetail(id));
}
