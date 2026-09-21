// 사용자 환불 신청 mutation
//
// 백엔드: DELETE /api/v1/booking/{bookingNumber}
// CONFIRMED 예매는 환불 신청(REFUNDING)으로 분기한다. 관리자 POST .../refund 와 분리 (#338).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestRefundApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import { applyRefundRequestedToBookingCaches } from "@/utils/booking/userRefund";

export function useRequestRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingNumber: string) => requestRefundApi(bookingNumber),
    onSuccess: (_data, bookingNumber) => {
      applyRefundRequestedToBookingCaches(queryClient, bookingNumber);
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    },
  });
}
