// 예매 API — 백엔드 booking-service swagger (2026-07-07) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   createBookingApi     → POST   /api/v1/booking
//   fetchBookingDetail   → GET    /api/v1/booking/{bookingNumber} (#560)
//   fetchMyBookings      → GET    /api/v1/booking/me (BookingMySummaryResponse)
//   countMyBookingsApi   → GET    /api/v1/booking/me/count
//   cancelBookingApi     → DELETE /api/v1/booking/{bookingNumber}
//   fetchPendingBookingExpiresAt → GET /api/v1/booking/{bookingNumber} 의 expires_at
//
// 변경 이력:
// - 2026-07-15 :
//   - 실 API 활성화 (기존 mock only → 실 API 스위치 추가)
//   - BookingSummary 매핑: 백엔드 bookingStatus → 프론트 status
//   - fetchMyBookings에 aggregation 로직 추가 (performance + seat 조회)
//   - cancelBookingApi를 DELETE로 변경 (기존 POST → 백엔드 스펙 일치)
// - 2026-09-05 (#168 / BE #560):
//   - fetchBookingDetail를 단건 조회로 교체 (/booking/me 스캔 우회 제거)
//   - /booking/me 보강 필드 사용. 관리자 환불 목록만 기존 aggregation 유지

import type {
  BookingListItem,
  BookingPendingRequest,
  BookingPendingResponse,
  BookingStatus,
  BookingDetail,
  MyBookingsParams,
  MyBookingsResponse,
  MyBookingCountResponse,
  AdminRefundBookingItem,
  AdminRefundBookingListParams,
  AdminRefundBookingListResponse,
} from "@/types/domain/booking";
import type { AdminBookingBookerResponse } from "./adminSeatMapper";
import {
  mockCreateBooking,
  mockGetBookingDetail,
  mockGetMyBookings,
  mockGetMyBookingCount,
  mockCancelBooking,
  mockGetRefundFailedBookings,
  mockGetRefundingStuckBookings,
  mockRetryRefund,
  mockGetAdminBookingByNumber,
} from "./mocks/bookings";
import { fetchConcertDetail } from "./concerts";
import { fetchSeatNumbers } from "./seats";
import apiClient from "./instance";
import { USE_MOCK } from "./useMock";
import { ApiError } from "./errors/errorMapper";
import { ERROR_CODES } from "./errors/errorCodes";

// -------------------------------------------------------
// 백엔드 응답 타입 (원본 스펙)
// -------------------------------------------------------

/** 백엔드 BookingMySummaryResponse (#560). 보강 필드는 키 생략 가능 */
interface BackendMyBookingSummary {
  bookingId: number;
  bookingNumber: string;
  userId?: number;
  performanceId: number;
  seatId: number;
  bookingStatus: BookingStatus;
  confirmedAt?: string | null;
  refundFailedAt?: string | null;
  updatedAt?: string;
  /** PENDING 결제 마감 시각 — BE `yyyy-MM-dd HH:mm:ss`. 그 외 상태는 생략 (#559) */
  expiresAt?: string | null;
  performanceTitle?: string;
  performanceDate?: string;
  performanceAddress?: string;
  seatNumber?: string;
  paymentAmount?: number;
}

/** 백엔드 BookingDetailResponse (#560). 보강 필드는 키 생략 가능 */
interface BackendBookingDetail {
  bookingId: number;
  bookingNumber: string;
  bookingStatus: BookingStatus;
  performanceId: number;
  performanceTitle?: string;
  performanceDate?: string;
  performanceTime?: string;
  performanceAddress?: string;
  seatId: number;
  seatNumber?: string;
  confirmedAt?: string | null;
  expiresAt?: string | null;
  paymentAmount?: number;
}

/** 백엔드 BookingCountResponse */
interface BackendBookingCount {
  bookingStatus: BookingStatus;
  count: number;
}

// -------------------------------------------------------
// 예매 생성 (POST /api/v1/booking)
// -------------------------------------------------------

export async function createBookingApi(
  req: BookingPendingRequest,
): Promise<BookingPendingResponse> {
  if (USE_MOCK) return mockCreateBooking(req);

  // axios-case-converter가 camelCase → snake_case 자동 변환:
  //   { performanceId, seatId } → { performance_id, seat_id }
  const res = await apiClient.post<BookingPendingResponse>(
    "/api/v1/booking",
    req,
  );
  return res.data;
}

// -------------------------------------------------------
// 예매 상세 (GET /api/v1/booking/{bookingNumber})
// -------------------------------------------------------

const BOOKING_ME_PAGE_SIZE = 100;
const BOOKING_ME_MAX_PAGES = 50;
/** 내 예매 목록 전체 조회용 (status 미지정 시 BE 기본 CONFIRMED만 오는 문제 방지) */
const MY_BOOKING_LIST_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELED",
  "REFUNDING",
  "REFUNDED",
  "EXPIRED",
];

function resolveBookingCreatedAt(s: BackendMyBookingSummary): string {
  // expiresAt은 결제 마감이라 예매일이 아님. PENDING은 confirmedAt이 없어 updatedAt 사용.
  return s.confirmedAt ?? s.updatedAt ?? "";
}

function mapBookingDetail(d: BackendBookingDetail): BookingDetail {
  return {
    bookingId: d.bookingId,
    bookingNumber: d.bookingNumber,
    status: d.bookingStatus,
    performanceId: d.performanceId,
    performanceTitle: d.performanceTitle ?? "",
    performanceVenue: d.performanceAddress ?? "",
    performanceDate: d.performanceDate ?? "",
    performanceTime: d.performanceTime ?? "",
    seatId: d.seatId,
    seatNumber: d.seatNumber ?? "",
    price: d.paymentAmount,
    paidAt: d.confirmedAt ?? null,
    createdAt: d.confirmedAt ?? "",
    expiresAt: d.expiresAt ?? null,
    cancelledAt: null,
  };
}

export async function fetchBookingDetail(
  bookingNumber: string,
): Promise<BookingDetail> {
  if (USE_MOCK) return mockGetBookingDetail(bookingNumber);

  const res = await apiClient.get<BackendBookingDetail>(
    `/api/v1/booking/${encodeURIComponent(bookingNumber)}`,
  );
  return mapBookingDetail(res.data);
}

// -------------------------------------------------------
// 내 예매 목록 (GET /api/v1/booking/me)
// -------------------------------------------------------

function mapMyBookingSummaries(
  summaries: BackendMyBookingSummary[],
  size: number,
): MyBookingsResponse {
  const items: BookingListItem[] = summaries.map((s) => ({
    bookingId: s.bookingId,
    bookingNumber: s.bookingNumber,
    status: s.bookingStatus,
    performanceTitle: s.performanceTitle ?? "",
    performanceVenue: s.performanceAddress ?? "",
    performanceDate: s.performanceDate ?? "",
    seatNumber: s.seatNumber ?? "",
    price: s.paymentAmount,
    createdAt: resolveBookingCreatedAt(s),
  }));

  return {
    items,
    hasNext: summaries.length >= size,
  };
}

async function fetchMyBookingSummariesPage(
  status: BookingStatus,
  page: number,
  size: number,
): Promise<BackendMyBookingSummary[]> {
  const listRes = await apiClient.get<BackendMyBookingSummary[]>(
    "/api/v1/booking/me",
    { params: { status, page, size } },
  );
  return listRes.data ?? [];
}

export async function fetchMyBookings(
  params: MyBookingsParams,
): Promise<MyBookingsResponse> {
  if (USE_MOCK) return mockGetMyBookings(params);

  const page = params.page ?? 0;
  const size = params.size ?? 20;

  if (params.status) {
    const summaries = await fetchMyBookingSummariesPage(
      params.status,
      page,
      size,
    );
    return mapMyBookingSummaries(summaries, size);
  }

  // status 미지정: BE 기본 CONFIRMED만 오는 것을 막고 전 상태 병렬 조회 후 merge.
  const neededCount = (page + 1) * size;
  const perStatusFetchSize = Math.min(
    BOOKING_ME_PAGE_SIZE * BOOKING_ME_MAX_PAGES,
    neededCount + 1,
  );
  const pages = await Promise.all(
    MY_BOOKING_LIST_STATUSES.map((status) =>
      fetchMyBookingSummariesPage(status, 0, perStatusFetchSize),
    ),
  );
  const merged = new Map<number, BackendMyBookingSummary>();
  for (const batch of pages) {
    for (const s of batch) {
      merged.set(s.bookingId, s);
    }
  }
  const summaries = Array.from(merged.values()).sort((a, b) => {
    const ta = resolveBookingCreatedAt(a);
    const tb = resolveBookingCreatedAt(b);
    return tb.localeCompare(ta);
  });

  const start = page * size;
  const pageSummaries = summaries.slice(start, start + size);
  const mayHaveMoreBeyondFetch = pages.some(
    (batch) => batch.length >= perStatusFetchSize,
  );
  const hasNext =
    start + size < summaries.length || mayHaveMoreBeyondFetch;

  return { ...mapMyBookingSummaries(pageSummaries, size), hasNext };
}

// -------------------------------------------------------
// 내 예매 수 조회 (GET /api/v1/booking/me/count)
// -------------------------------------------------------

export async function countMyBookingsApi(
  status?: BookingStatus,
): Promise<MyBookingCountResponse> {
  if (USE_MOCK) return mockGetMyBookingCount();

  const res = await apiClient.get<BackendBookingCount>(
    "/api/v1/booking/me/count",
    { params: status ? { status } : undefined },
  );
  return { count: res.data.count };
}

// -------------------------------------------------------
// 예매 취소 (DELETE /api/v1/booking/{bookingNumber})
// -------------------------------------------------------

export async function fetchPendingBookingExpiresAt(
  bookingNumber: string,
): Promise<string | null> {
  if (USE_MOCK) {
    const { mockFetchPendingBookingExpiresAt } = await import("./mocks/bookings");
    return mockFetchPendingBookingExpiresAt(bookingNumber);
  }

  try {
    const res = await apiClient.get<BackendBookingDetail>(
      `/api/v1/booking/${encodeURIComponent(bookingNumber)}`,
    );
    return res.data.expiresAt ?? null;
  } catch (error) {
    const apiError = ApiError.fromUnknown(error);
    if (
      apiError.httpStatus === 404 ||
      apiError.code === ERROR_CODES.BOOKING_NOT_FOUND
    ) {
      return null;
    }
    throw error;
  }
}

export async function cancelBookingApi(bookingNumber: string): Promise<void> {
  if (USE_MOCK) return mockCancelBooking(bookingNumber);

  await apiClient.delete(`/api/v1/booking/${bookingNumber}`);
}

// -------------------------------------------------------
// 관리자: 환불 모니터링 (booking-service admin, 2026-07-18 실측으로 확인된 실 API)
// -------------------------------------------------------

/** 백엔드 BookingSummaryResponse (관리자 환불 조회용, userId/refundFailedAt/updatedAt 포함) */
interface BackendAdminRefundBooking {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  performanceId: number;
  seatId: number;
  bookingStatus: BookingStatus;
  confirmedAt: string | null;
  refundFailedAt: string | null;
  updatedAt: string;
}

/**
 * hasNext 결정:
 *   1. interceptor가 분리한 paginationInfo.hasNext 우선
 *   2. 없으면 items.length === requestedSize fallback
 *      (마지막 페이지 항목 수가 size와 같으면 false positive 가능)
 */
function resolveAdminRefundHasNext(
  paginationHasNext: boolean | undefined,
  itemCount: number,
  requestedSize: number,
): boolean {
  if (typeof paginationHasNext === "boolean") return paginationHasNext;
  return itemCount === requestedSize;
}

async function toAdminRefundListResponse(
  raw: BackendAdminRefundBooking[],
  requestedSize: number,
  paginationHasNext?: boolean,
): Promise<AdminRefundBookingListResponse> {
  const items: AdminRefundBookingItem[] = raw.map((b) => ({
    bookingId: b.bookingId,
    bookingNumber: b.bookingNumber,
    userId: b.userId,
    performanceId: b.performanceId,
    seatId: b.seatId,
    status: b.bookingStatus,
    confirmedAt: b.confirmedAt,
    refundFailedAt: b.refundFailedAt,
    updatedAt: b.updatedAt,
  }));

  if (items.length === 0) {
    return { items: [], hasNext: false };
  }

  const uniquePerformanceIds = Array.from(
    new Set(items.map((i) => i.performanceId)),
  );
  const concertsMap = new Map<
    number,
    Awaited<ReturnType<typeof fetchConcertDetail>>
  >();
  await Promise.all(
    uniquePerformanceIds.map(async (id) => {
      try {
        concertsMap.set(id, await fetchConcertDetail(id));
      } catch (error) {
        console.warn(`Failed to fetch concert ${id}:`, error);
      }
    }),
  );

  const seatIds = Array.from(new Set(items.map((i) => i.seatId)));
  let seatNumberMap = new Map<number, string>();
  try {
    const seatNumbersArr = await fetchSeatNumbers(seatIds);
    seatNumberMap = new Map(
      seatNumbersArr.map((s) => [s.seatId, s.seatNumber]),
    );
  } catch (error) {
    console.warn("Failed to fetch seat numbers for refund list:", error);
  }

  const richItems = items.map((i) => ({
    ...i,
    performanceTitle: concertsMap.get(i.performanceId)?.title ?? "삭제된 공연",
    seatNumber: seatNumberMap.get(i.seatId) ?? "?",
  }));

  return {
    items: richItems,
    hasNext: resolveAdminRefundHasNext(
      paginationHasNext,
      items.length,
      requestedSize,
    ),
  };
}

/** 백엔드: GET /api/v1/booking/admin/bookings/refund-failed (환불 처리 자체가 실패한 건) */
export async function getRefundFailedBookingsApi(
  params: AdminRefundBookingListParams = {},
): Promise<AdminRefundBookingListResponse> {
  if (USE_MOCK) return mockGetRefundFailedBookings(params);

  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const res = await apiClient.get<BackendAdminRefundBooking[]>(
    "/api/v1/booking/admin/bookings/refund-failed",
    { params: { page, size } },
  );
  return toAdminRefundListResponse(
    res.data ?? [],
    size,
    res.pagination?.hasNext,
  );
}

/** 백엔드: GET /api/v1/booking/admin/bookings/refunding-stuck (REFUNDING 상태로 멈춰있는 건) */
export async function getRefundingStuckBookingsApi(
  params: AdminRefundBookingListParams = {},
): Promise<AdminRefundBookingListResponse> {
  if (USE_MOCK) return mockGetRefundingStuckBookings(params);

  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const res = await apiClient.get<BackendAdminRefundBooking[]>(
    "/api/v1/booking/admin/bookings/refunding-stuck",
    { params: { page, size } },
  );
  return toAdminRefundListResponse(
    res.data ?? [],
    size,
    res.pagination?.hasNext,
  );
}

/** 백엔드: POST /api/v1/booking/admin/{bookingNumber}/refund-retry */
export async function retryRefundApi(bookingNumber: string): Promise<void> {
  if (USE_MOCK) return mockRetryRefund(bookingNumber);

  await apiClient.post(`/api/v1/booking/admin/${bookingNumber}/refund-retry`);
}

/**
 * 관리자 예매 단건 — 좌석 상세의 bookingNumber로 예매자를 조합한다 (#169 / BE #562).
 * GET /api/v1/booking/admin/bookings/{bookingNumber}
 */
export async function fetchAdminBookingByNumber(
  bookingNumber: string,
): Promise<AdminBookingBookerResponse> {
  if (USE_MOCK) return mockGetAdminBookingByNumber(bookingNumber);

  const res = await apiClient.get<AdminBookingBookerResponse>(
    `/api/v1/booking/admin/bookings/${encodeURIComponent(bookingNumber)}`,
  );
  if (res.data == null) {
    throw new Error("예매 정보를 불러올 수 없습니다.");
  }
  return res.data;
}
