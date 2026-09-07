// 관리자: 환불 모니터링 hooks — booking-service 실 API (2026-07-18 확인)
//
// AdminBookingsPage/AdminRefundsPage가 기존에 쓰던 useAdmin.ts의
// useAdminBookings/useAdminRefundBooking(전부 mock-only "가상 admin API")과는
// 별개다. 이 파일은 실제로 존재하는 booking-service admin 엔드포인트
// (refund-failed / refunding-stuck / refund-retry)만 다룬다.
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
