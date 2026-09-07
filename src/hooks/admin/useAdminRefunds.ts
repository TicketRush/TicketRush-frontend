// 관리자: 환불 모니터링 hooks — booking-service 실 API
//
// 예매 내역(#174)의 목록·stats·환불(POST .../refund)과 분리한다.
// 이 파일은 환불 실패·고착 복구(#135)만 다룬다:
//   GET  .../refund-failed, .../refunding-stuck
//   POST .../refund-retry
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRefundFailedBookingsApi,
  getRefundingStuckBookingsApi,
  retryRefundApi,
} from "@/api/bookings";
import type { AdminRefundBookingListParams } from "@/types/domain/booking";

const refundKeys = {
  all: ["admin", "refunds"] as const,
  failed: (params: AdminRefundBookingListParams) =>
    ["admin", "refunds", "failed", params] as const,
  stuck: (params: AdminRefundBookingListParams) =>
    ["admin", "refunds", "stuck", params] as const,
};

export function useRefundFailedBookings(params: AdminRefundBookingListParams) {
  return useQuery({
    queryKey: refundKeys.failed(params),
    queryFn: () => getRefundFailedBookingsApi(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useRefundingStuckBookings(
  params: AdminRefundBookingListParams,
) {
  return useQuery({
    queryKey: refundKeys.stuck(params),
    queryFn: () => getRefundingStuckBookingsApi(params),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useRetryRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: retryRefundApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: refundKeys.all });
    },
  });
}
