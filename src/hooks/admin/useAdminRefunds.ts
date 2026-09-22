// 관리자 환불 통합 목록 (#675).
//   GET  /booking/admin/refunds
//   GET  /booking/admin/refunds/stats
//   POST /booking/admin/{bookingNumber}/refund-retry
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminRefundsApi,
  getAdminRefundStatsApi,
  retryRefundApi,
} from "@/api/bookings";
import type { AdminRefundListParams } from "@/types/domain/booking";

const refundKeys = {
  all: ["admin", "refunds"] as const,
  stats: () => ["admin", "refunds", "stats"] as const,
  list: (params: AdminRefundListParams) =>
    ["admin", "refunds", "list", params] as const,
};

export function useAdminRefundStats() {
  return useQuery({
    queryKey: refundKeys.stats(),
    queryFn: getAdminRefundStatsApi,
    staleTime: 10_000,
  });
}

export function useAdminRefundList(params: AdminRefundListParams) {
  return useQuery({
    queryKey: refundKeys.list(params),
    queryFn: () => getAdminRefundsApi(params),
    staleTime: 10_000,
    placeholderData: (previousData, previousQuery) => {
      const previous = previousQuery?.queryKey.at(-1) as
        | AdminRefundListParams
        | undefined;
      if (previous?.refundStatus !== params.refundStatus) return undefined;
      return previousData;
    },
  });
}

export function useRetryRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryRefundApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: refundKeys.all });
    },
  });
}
