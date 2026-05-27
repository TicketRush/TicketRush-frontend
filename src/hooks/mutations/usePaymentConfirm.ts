// 결제 confirm mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentConfirmApi } from "@/api/payments";
import { queryKeys } from "@/constants/queryKeys";
import type { PaymentConfirmRequest } from "@/types/domain/payment";

export function usePaymentConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: PaymentConfirmRequest) => paymentConfirmApi(req),
    onSuccess: (data) => {
      // 예매 캐시 무효화 — 마이페이지 진입 시 fresh 데이터
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(data.bookingNumber),
      });
    },
  });
}
