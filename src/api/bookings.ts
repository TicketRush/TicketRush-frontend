// 예매 API — 백엔드 booking-service swagger (2026-07-07) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   createBookingApi     → POST   /api/v1/booking
//   fetchBookingDetail   → GET    /api/v1/booking/{bookingNumber} (#560)
//   fetchMyBookings      → GET    /api/v1/booking/me (BookingMySummaryResponse)
//   countMyBookingsApi   → GET    /api/v1/booking/me/count
//   cancelBookingApi     → DELETE /api/v1/booking/{bookingNumber}
//   requestRefundApi     → DELETE /api/v1/booking/{bookingNumber} (CONFIRMED → REFUNDING)
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
//   - /booking/me 보강 필드 사용. 관리자 환불 목록은 #675 응답을 그대로 쓴다

import {
  MY_PAGE_BOOKING_STATUSES,
  type BookingListItem,
  type BookingPendingRequest,
  type BookingPendingResponse,
  type BookingStatus,
  type BookingDetail,
  type MyBookingsParams,
  type MyBookingsResponse,
  type MyBookingCountResponse,
  type AdminRefundListParams,
  type AdminRefundListResponse,
  type AdminRefundStats,
} from "@/types/domain/booking";
import type { AdminBookingBookerResponse } from "./adminSeatMapper";
import {
  mockCreateBooking,
  mockGetBookingDetail,
  mockGetMyBookings,
  mockGetMyBookingCount,
  mockCancelBooking,
  mockGetAdminRefunds,
  mockGetAdminRefundStats,
  mockRetryRefund,
  mockGetAdminBookingByNumber,
} from "./mocks/bookings";
import apiClient from "./instance";
import { USE_MOCK } from "./useMock";
import { ApiError } from "./errors/errorMapper";
import { ERROR_CODES } from "./errors/errorCodes";
import { isPageInfo } from "./types/pagination";
import { sumMyPageBookingCounts } from "@/utils/booking";
import { applyUserRefundDeleteError } from "@/utils/booking/userRefund";
import {
  MY_BOOKINGS_PAGE_SIZE,
  mergeMyBookingsById,
} from "@/utils/booking/myBookingsPages";

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
  /** PENDING 결제 마감 시각 — BE Instant(UTC naive 또는 ISO `Z`). 그 외 상태는 생략 (#559/#246) */
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

/** BE `PaginationConstants.MAX_PAGE_SIZE` — `/booking/me`도 동일 상한. */
const BOOKING_ME_MAX_PAGE_SIZE = 50;

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
  hasNext: boolean,
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

  return { items, hasNext };
}

/** 한 status의 한 페이지. size는 BE 상한(50)을 넘기지 않는다. */
async function fetchMyBookingSummariesPage(
  status: BookingStatus,
  page: number,
  size: number,
): Promise<{ items: BackendMyBookingSummary[]; hasNext: boolean }> {
  const cappedSize = Math.min(size, BOOKING_ME_MAX_PAGE_SIZE);
  const res = await apiClient.get<BackendMyBookingSummary[]>(
    "/api/v1/booking/me",
    { params: { status, page, size: cappedSize } },
  );
  const items = res.data ?? [];
  const hasNext =
    res.pagination && isPageInfo(res.pagination)
      ? res.pagination.hasNext
      : items.length >= cappedSize;
  return { items, hasNext };
}

export async function fetchMyBookings(
  params: MyBookingsParams,
): Promise<MyBookingsResponse> {
  if (USE_MOCK) return mockGetMyBookings(params);

  const page = params.page ?? 0;
  const size = Math.min(
    params.size ?? MY_BOOKINGS_PAGE_SIZE,
    BOOKING_ME_MAX_PAGE_SIZE,
  );

  if (params.status) {
    const batch = await fetchMyBookingSummariesPage(params.status, page, size);
    return mapMyBookingSummaries(batch.items, batch.hasNext);
  }

  // status 미지정: 노출 상태의 같은 page만 받아 합친다 (#339/#380).
  // page를 올릴 때 앞부분을 다시 받아 자르지 않는다. BE size 상한은 50.
  const batches = await Promise.all(
    MY_PAGE_BOOKING_STATUSES.map((status) =>
      fetchMyBookingSummariesPage(status, page, size),
    ),
  );
  const summaries = mergeMyBookingsById(
    batches.map((batch) => batch.items),
    (item) => item.bookingId,
    resolveBookingCreatedAt,
  );

  return mapMyBookingSummaries(
    summaries,
    batches.some((batch) => batch.hasNext),
  );
}

// -------------------------------------------------------
// 내 예매 수 조회 (GET /api/v1/booking/me/count)
// -------------------------------------------------------

export async function countMyBookingsApi(
  status?: BookingStatus,
): Promise<MyBookingCountResponse> {
  if (USE_MOCK) return mockGetMyBookingCount(status);

  if (!status) {
    const parts = await Promise.all(
      MY_PAGE_BOOKING_STATUSES.map((itemStatus) =>
        countMyBookingsApi(itemStatus),
      ),
    );
    return { count: sumMyPageBookingCounts(parts) };
  }

  const res = await apiClient.get<BackendBookingCount>(
    "/api/v1/booking/me/count",
    { params: { status } },
  );
  return { count: res.data.count };
}

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

// 사용자용 /refund 는 없다. 같은 DELETE가 상태로 분기한다 (#338):
//   PENDING   → CANCELED
//   CONFIRMED → REFUNDING
// 관리자 강제 환불은 POST /booking/admin/{bookingNumber}/refund.
export async function cancelBookingApi(bookingNumber: string): Promise<void> {
  try {
    if (USE_MOCK) {
      await mockCancelBooking(bookingNumber);
      return;
    }
    await apiClient.delete(
      `/api/v1/booking/${encodeURIComponent(bookingNumber)}`,
    );
  } catch (error) {
    throw ApiError.fromUnknown(error);
  }
}

/**
 * CONFIRMED 예매 환불 신청. HTTP는 cancelBookingApi와 같다.
 * 마감·공연 정보 실패 기록은 환불 신청에만 남긴다.
 * 결제 대기 취소와 좌석 해제는 같은 DELETE를 써도 이 기록을 타지 않는다 (#370).
 */
export async function requestRefundApi(bookingNumber: string): Promise<void> {
  try {
    await cancelBookingApi(bookingNumber);
  } catch (error) {
    throw applyUserRefundDeleteError(bookingNumber, error);
  }
}

// -------------------------------------------------------
// 관리자: 환불 통합 목록 (#675)
// -------------------------------------------------------

function resolveAdminRefundHasNext(
  paginationHasNext: boolean | undefined,
  itemCount: number,
  requestedSize: number,
): boolean {
  if (typeof paginationHasNext === "boolean") return paginationHasNext;
  return itemCount === requestedSize;
}

/** 백엔드: GET /api/v1/booking/admin/refunds. 쿼리 이름은 refund_status. */
export async function getAdminRefundsApi(
  params: AdminRefundListParams = {},
): Promise<AdminRefundListResponse> {
  if (USE_MOCK) return mockGetAdminRefunds(params);

  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const res = await apiClient.get<AdminRefundListResponse["items"]>(
    "/api/v1/booking/admin/refunds",
    {
      params: {
        page,
        size,
        ...(params.refundStatus
          ? { refund_status: params.refundStatus }
          : {}),
      },
    },
  );
  const items = res.data ?? [];
  return {
    items,
    hasNext: resolveAdminRefundHasNext(res.pagination?.hasNext, items.length, size),
  };
}

/** 백엔드: GET /api/v1/booking/admin/refunds/stats. 목록 필터와 무관한 전체 모집단. */
export async function getAdminRefundStatsApi(): Promise<AdminRefundStats> {
  if (USE_MOCK) return mockGetAdminRefundStats();

  const res = await apiClient.get<AdminRefundStats>(
    "/api/v1/booking/admin/refunds/stats",
  );
  return res.data;
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
