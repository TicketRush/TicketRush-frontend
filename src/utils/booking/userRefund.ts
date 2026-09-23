// 사용자 환불 신청 — DELETE /api/v1/booking/{bookingNumber}
//
// 사용자용 별도 /refund 엔드포인트는 없다. 같은 DELETE가 상태로 분기한다:
//   PENDING   → CANCELED  (결제 전 취소, 좌석 HOLD 해제)
//   CONFIRMED → REFUNDING (환불 신청. 처리는 비동기)
// 관리자 강제 환불은 POST /booking/admin/{bookingNumber}/refund (#174).
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { ApiError } from "@/api/errors/errorMapper";
import { queryKeys } from "@/constants/queryKeys";
import type {
  BookingDetail,
  BookingListItem,
  BookingStatus,
  MyBookingsResponse,
} from "@/types/domain/booking";

/** DELETE 성공 시 프론트가 기대하는 다음 상태. 그 외는 호출하면 안 된다. */
export function nextStatusAfterUserBookingDelete(
  status: BookingStatus,
): "CANCELED" | "REFUNDING" | null {
  if (status === "PENDING") return "CANCELED";
  if (status === "CONFIRMED") return "REFUNDING";
  return null;
}

/** invalidate 재조회가 아직 CONFIRMED여도 방금 신청한 건을 REFUNDING으로 유지한다. */
const requestedRefundNumbers = new Set<string>();

export function rememberRefundRequested(bookingNumber: string): void {
  requestedRefundNumbers.add(bookingNumber);
}

export function clearRequestedRefunds(): void {
  requestedRefundNumbers.clear();
}

/**
 * 목록은 공연 시각이 없어 달력 일수로 환불 버튼을 켜 두는데,
 * 서버는 시작 시각 기준이라 BOOKING_409_007 을 줄 수 있다 (#370).
 * 거절된 예매번호는 이번 세션에서 버튼을 끈다. 새로고침하면 다시 서버에 맡긴다.
 */
const refundDeadlinePassedNumbers = new Set<string>();

export function rememberRefundDeadlinePassed(bookingNumber: string): void {
  refundDeadlinePassedNumbers.add(bookingNumber);
}

export function isRefundDeadlinePassed(bookingNumber: string): boolean {
  return refundDeadlinePassedNumbers.has(bookingNumber);
}

export function clearRefundDeadlinePassed(): void {
  refundDeadlinePassedNumbers.clear();
}

/** 같은 예매에서 공연 정보 503이 한 번 더 나면 이번 세션에서 환불을 막는다 (#370). */
const REFUND_LOOKUP_BLOCKED_MESSAGE =
  "공연 정보를 확인할 수 없어 지금은 환불할 수 없습니다.";

const refundLookupRetriedNumbers = new Set<string>();
const refundLookupBlockedNumbers = new Set<string>();

export function isRefundPerformanceUnavailable(bookingNumber: string): boolean {
  return refundLookupBlockedNumbers.has(bookingNumber);
}

export function clearRefundPerformanceLookup(): void {
  refundLookupRetriedNumbers.clear();
  refundLookupBlockedNumbers.clear();
}

/** 로그아웃 때 마감·공연 정보 실패로 꺼 둔 환불 버튼을 되돌린다. */
export function clearRefundRejectionSession(): void {
  clearRefundDeadlinePassed();
  clearRefundPerformanceLookup();
}

function noteRefundPerformanceLookupFailure(bookingNumber: string): boolean {
  if (refundLookupBlockedNumbers.has(bookingNumber)) return true;
  if (refundLookupRetriedNumbers.has(bookingNumber)) {
    refundLookupBlockedNumbers.add(bookingNumber);
    return true;
  }
  refundLookupRetriedNumbers.add(bookingNumber);
  return false;
}

/**
 * DELETE 예매 실패를 이번 세션에 반영한다.
 * 마감(409)은 버튼을 끈다. 목록에는 공연 시각이 없어 재조회로는 버튼이 안 바뀐다.
 * 공연 정보 503은 첫 실패만 재시도하고, 같은 예매의 두 번째부터 버튼을 끈다.
 * requestRefundApi에서만 호출한다. 결제 대기 취소·좌석 해제는 세지 않는다.
 * 토스트는 이 함수가 고친 message를 쓴다. react-query onError보다 먼저 호출되어야 한다.
 */
export function applyUserRefundDeleteError(
  bookingNumber: string,
  error: unknown,
): ApiError {
  const apiError = ApiError.fromUnknown(error);
  if (apiError.code === ERROR_CODES.BOOKING_REFUND_DEADLINE_PASSED) {
    rememberRefundDeadlinePassed(bookingNumber);
    return apiError;
  }
  if (
    apiError.code === ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED &&
    noteRefundPerformanceLookupFailure(bookingNumber)
  ) {
    apiError.message = REFUND_LOOKUP_BLOCKED_MESSAGE;
  }
  return apiError;
}

/** 서버 목록이 아직 CONFIRMED여도 방금 신청한 건은 REFUNDING으로 보여 준다. */
export function overlayRequestedRefundStatus(
  status: BookingStatus | undefined,
  bookingNumber: string,
  requested: ReadonlySet<string> = requestedRefundNumbers,
): BookingStatus | undefined {
  if (status === "CONFIRMED" && requested.has(bookingNumber)) return "REFUNDING";
  return status;
}

export function withRequestedRefunds<
  T extends { bookingNumber: string; status: BookingStatus },
>(
  items: T[],
  requested: ReadonlySet<string> = requestedRefundNumbers,
): T[] {
  if (requested.size === 0) return items;
  let changed = false;
  const next = items.map((item) => {
    const status = overlayRequestedRefundStatus(
      item.status,
      item.bookingNumber,
      requested,
    );
    if (status === item.status) return item;
    changed = true;
    return { ...item, status: status! };
  });
  return changed ? next : items;
}

export function overlayMyBookingsResponse(
  data: MyBookingsResponse,
): MyBookingsResponse {
  const items = withRequestedRefunds(data.items);
  return items === data.items ? data : { ...data, items };
}

export function overlayBookingDetail(data: BookingDetail): BookingDetail {
  const status = overlayRequestedRefundStatus(
    data.status,
    data.bookingNumber,
  );
  return status === data.status ? data : { ...data, status: status! };
}

export function markBookingRefundRequested<
  T extends { bookingNumber: string; status: BookingStatus },
>(item: T, bookingNumber: string): T {
  if (item.bookingNumber !== bookingNumber || item.status !== "CONFIRMED") {
    return item;
  }
  return { ...item, status: "REFUNDING" };
}

function patchMineListItems(
  items: BookingListItem[],
  bookingNumber: string,
): BookingListItem[] {
  return items.map((item) => markBookingRefundRequested(item, bookingNumber));
}

function isInfiniteMyBookings(
  current: MyBookingsResponse | InfiniteData<MyBookingsResponse>,
): current is InfiniteData<MyBookingsResponse> {
  return "pages" in current && Array.isArray(current.pages);
}

/** 성공 직후 목록·상세 캐시를 REFUNDING으로 맞추고, 재조회에도 덮어 유지한다. */
export function applyRefundRequestedToBookingCaches(
  queryClient: QueryClient,
  bookingNumber: string,
): void {
  rememberRefundRequested(bookingNumber);
  queryClient.setQueriesData<
    MyBookingsResponse | InfiniteData<MyBookingsResponse>
  >({ queryKey: queryKeys.bookings.minePrefix }, (current) => {
    if (!current) return current;
    if (isInfiniteMyBookings(current)) {
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: patchMineListItems(page.items, bookingNumber),
        })),
      };
    }
    if (!("items" in current) || !current.items) return current;
    return {
      ...current,
      items: patchMineListItems(current.items, bookingNumber),
    };
  });
  queryClient.setQueryData<BookingDetail>(
    queryKeys.bookings.detail(bookingNumber),
    (current) =>
      current ? markBookingRefundRequested(current, bookingNumber) : current,
  );
}
