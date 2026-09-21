// 사용자 환불 신청 — DELETE /api/v1/booking/{bookingNumber}
//
// 사용자용 별도 /refund 엔드포인트는 없다. 같은 DELETE가 상태로 분기한다:
//   PENDING   → CANCELED  (결제 전 취소, 좌석 HOLD 해제)
//   CONFIRMED → REFUNDING (환불 신청. 처리는 비동기)
// 관리자 강제 환불은 POST /booking/admin/{bookingNumber}/refund (#174).
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type {
  BookingDetail,
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

/** 성공 직후 목록·상세 캐시를 REFUNDING으로 맞추고, 재조회에도 덮어 유지한다. */
export function applyRefundRequestedToBookingCaches(
  queryClient: QueryClient,
  bookingNumber: string,
): void {
  rememberRefundRequested(bookingNumber);
  queryClient.setQueriesData<MyBookingsResponse>(
    { queryKey: queryKeys.bookings.minePrefix },
    (current) => {
      if (!current?.items) return current;
      return {
        ...current,
        items: current.items.map((item) =>
          markBookingRefundRequested(item, bookingNumber),
        ),
      };
    },
  );
  queryClient.setQueryData<BookingDetail>(
    queryKeys.bookings.detail(bookingNumber),
    (current) =>
      current ? markBookingRefundRequested(current, bookingNumber) : current,
  );
}
