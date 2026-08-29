// 예매 API — 백엔드 booking-service swagger (2026-07-07) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   createBookingApi     → POST   /api/v1/booking
//   fetchBookingDetail   → 프론트 aggregation (booking + performance + seat 조합)
//   fetchMyBookings      → GET    /api/v1/booking/me + performance/seat aggregation
//   countMyBookingsApi   → GET    /api/v1/booking/me/count
//   cancelBookingApi     → DELETE /api/v1/booking/{bookingNumber}
//
// 변경 이력:
// - 2026-07-15 :
//   - 실 API 활성화 (기존 mock only → 실 API 스위치 추가)
//   - BookingSummary 매핑: 백엔드 bookingStatus → 프론트 status
//   - fetchMyBookings에 aggregation 로직 추가 (performance + seat 조회)
//   - cancelBookingApi를 DELETE로 변경 (기존 POST → 백엔드 스펙 일치)

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
import {
  mockCreateBooking,
  mockGetBookingDetail,
  mockGetMyBookings,
  mockGetMyBookingCount,
  mockCancelBooking,
  mockGetRefundFailedBookings,
  mockGetRefundingStuckBookings,
  mockRetryRefund,
} from "./mocks/bookings";
import { fetchConcertDetail } from "./concerts";
import { fetchSeatNumbers } from "./seats";
import apiClient from "./instance";
import { USE_MOCK } from "./useMock";

// -------------------------------------------------------
// 백엔드 응답 타입 (원본 스펙)
// -------------------------------------------------------

/** 백엔드 BookingSummaryResponse */
interface BackendBookingSummary {
  bookingId: number;
  bookingNumber: string;
  performanceId: number;
  seatId: number;
  bookingStatus: BookingStatus;
  confirmedAt: string | null;
  /** 예매 생성/만료 시각 — BE 응답에 있으면 사용 (없으면 optional) */
  createdAt?: string | null;
  expiresAt?: string | null;
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
// 예매 상세 (프론트 aggregation)
// -------------------------------------------------------

//
// 예매 상세 조회 (aggregation).
//
// ⚠️ 백엔드에 단건 조회 API 없음 (후속: FE #168 / BE #560).
// 현재 우회:
//   1. GET /api/v1/booking/me 를 status·page 순회하며 bookingNumber 찾기
//   2. GET /api/v1/performance/{performanceId} 공연 정보 조회
//   3. GET /api/v1/seat/numbers?seatIds= 좌석 번호 조회
//
// 결제 정보(price, paidAt)는 booking 응답에서 파생 불가 → 결제 API 별도 조회 필요.
// 지금은 concert.price로 fallback. 필요 시 GET /payment 로직 추가.

const BOOKING_ME_PAGE_SIZE = 100;
const BOOKING_ME_MAX_PAGES = 50;
/** 단건 조회 우회 시 status 순회 목록 (BE 기본값이 CONFIRMED라 명시 필요) */
const BOOKING_DETAIL_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELED",
  "REFUNDING",
  "REFUNDED",
  "EXPIRED",
];
/** 내 예매 목록 전체 조회용 (status 미지정 시 BE 기본 CONFIRMED만 오는 문제 방지) */
const MY_BOOKING_LIST_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELED",
  "REFUNDING",
  "REFUNDED",
  "EXPIRED",
];

function resolveBookingCreatedAt(s: BackendBookingSummary): string {
  return s.confirmedAt ?? s.createdAt ?? s.expiresAt ?? "";
}

/** /booking/me 를 status·page 순회해 bookingNumber에 해당하는 summary를 찾는다. */
async function findMyBookingSummary(
  bookingNumber: string,
): Promise<BackendBookingSummary | undefined> {
  for (const status of BOOKING_DETAIL_STATUSES) {
    for (let page = 0; page < BOOKING_ME_MAX_PAGES; page++) {
      const listRes = await apiClient.get<BackendBookingSummary[]>(
        "/api/v1/booking/me",
        { params: { status, page, size: BOOKING_ME_PAGE_SIZE } },
      );
      const summaries = listRes.data ?? [];
      const found = summaries.find((b) => b.bookingNumber === bookingNumber);
      if (found) return found;
      if (summaries.length < BOOKING_ME_PAGE_SIZE) break;
    }
  }
  return undefined;
}

export async function fetchBookingDetail(
  bookingNumber: string,
): Promise<BookingDetail> {
  if (USE_MOCK) return mockGetBookingDetail(bookingNumber);

  // 1. 내 예매 목록에서 해당 bookingNumber 찾기 (단건 API 전까지 pagination 우회)
  const target = await findMyBookingSummary(bookingNumber);
  if (!target) {
    throw new Error("예매 정보를 찾을 수 없습니다.");
  }

  // 2. 공연 정보 조회 + 좌석 번호 조회 병렬 실행
  const [concert, seatNumbers] = await Promise.all([
    fetchConcertDetail(target.performanceId),
    fetchSeatNumbers([target.seatId]),
  ]);

  const seatNumber =
    seatNumbers.find((s) => s.seatId === target.seatId)?.seatNumber ?? "?";

  return {
    bookingId: target.bookingId,
    bookingNumber: target.bookingNumber,
    status: target.bookingStatus,
    performanceId: target.performanceId,
    performanceTitle: concert.title,
    performancePerformer: concert.performer,
    performanceVenue: concert.venue ?? concert.address,
    performanceDate: concert.showDate,
    performanceTime: concert.showTime,
    performanceImageMainUrl: concert.imageMainUrl,
    seatId: target.seatId,
    seatNumber,
    price: concert.price,
    paidAt: target.confirmedAt,
    createdAt: resolveBookingCreatedAt(target) || new Date().toISOString(),
    cancelledAt: null,
  };
}

// -------------------------------------------------------
// 내 예매 목록 (GET /api/v1/booking/me + aggregation)
// -------------------------------------------------------

// 내 예매 목록 조회.
//
// aggregation 순서:
//   1. GET /api/v1/booking/me → BookingSummary[]
//      ⚠️ BE는 status 기본값이 CONFIRMED → status 미지정 시 상태별 병렬 조회 후 merge
//   2. unique performanceId 목록 추출 → GET /performance/{id} 병렬 조회
//   3. 모든 seatId 목록 → GET /seat/numbers 한 번에 조회
//   4. 조합하여 BookingListItem[] 반환

// ⚠️ 성능 우려: 예매가 많으면 performance 조회가 N+1.
// 현재는 unique로 dedupe만 함. 심하면 백엔드 batch endpoint 요청 고려.

async function aggregateMyBookingSummaries(
  summaries: BackendBookingSummary[],
  size: number,
): Promise<MyBookingsResponse> {
  if (summaries.length === 0) {
    return { items: [], hasNext: false };
  }

  const uniquePerformanceIds = Array.from(
    new Set(summaries.map((s) => s.performanceId)),
  );
  const concertsMap = new Map<
    number,
    Awaited<ReturnType<typeof fetchConcertDetail>>
  >();

  await Promise.all(
    uniquePerformanceIds.map(async (id) => {
      try {
        const concert = await fetchConcertDetail(id);
        concertsMap.set(id, concert);
      } catch (error) {
        console.warn(`Failed to fetch concert ${id}:`, error);
      }
    }),
  );

  const allSeatIds = Array.from(new Set(summaries.map((s) => s.seatId)));
  const seatNumbersArr = await fetchSeatNumbers(allSeatIds);
  const seatNumberMap = new Map(
    seatNumbersArr.map((s) => [s.seatId, s.seatNumber]),
  );

  const items: BookingListItem[] = summaries.map((s) => {
    const concert = concertsMap.get(s.performanceId);
    return {
      bookingId: s.bookingId,
      bookingNumber: s.bookingNumber,
      status: s.bookingStatus,
      performanceTitle: concert?.title ?? "삭제된 공연",
      performanceVenue: concert?.venue ?? concert?.address ?? "",
      performanceDate: concert?.showDate ?? "",
      performanceTime: concert?.showTime ?? "",
      performanceImageMainUrl: concert?.imageMainUrl ?? "",
      seatNumber: seatNumberMap.get(s.seatId) ?? "?",
      price: concert?.price ?? 0,
      createdAt: resolveBookingCreatedAt(s),
    };
  });

  return {
    items,
    hasNext: summaries.length >= size,
  };
}

async function fetchMyBookingSummariesPage(
  status: BookingStatus,
  page: number,
  size: number,
): Promise<BackendBookingSummary[]> {
  const listRes = await apiClient.get<BackendBookingSummary[]>(
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

  // status 지정 시 해당 상태만 조회
  if (params.status) {
    const summaries = await fetchMyBookingSummariesPage(
      params.status,
      page,
      size,
    );
    return aggregateMyBookingSummaries(summaries, size);
  }

  // status 미지정: BE 기본 CONFIRMED만 오는 것을 막고 전 상태 병렬 조회 후 merge.
  // BE는 status당 pagination만 지원하므로, 요청 페이지를 채울 만큼 각 상태에서
  // 앞쪽 항목을 가져온 뒤 **전체 목록 기준**으로 정렬·slice·hasNext를 계산한다.
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
  const merged = new Map<number, BackendBookingSummary>();
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

  const aggregated = await aggregateMyBookingSummaries(pageSummaries, size);
  return { ...aggregated, hasNext };
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
