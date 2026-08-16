// 결제 confirm mutation
//
// 백엔드: POST /api/v1/payment/confirm
//
// 변경사항 (백엔드 스펙 반영):
//   - 새 PaymentConfirmResponse에 bookingNumber 없음
//     → 세부 booking 캐시 무효화 대신 booking.all 전체 무효화로 단순화
//     → 마이페이지 진입 시 fresh 데이터 보장

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentConfirmApi } from "@/api/payments";
import { queryKeys } from "@/constants/queryKeys";
import type { PaymentConfirmRequest } from "@/types/domain/payment";

export function usePaymentConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: PaymentConfirmRequest) => paymentConfirmApi(req),
    onSuccess: () => {
      // 예매 캐시 전체 무효화 → 마이페이지/티켓 페이지에서 fresh 데이터 재조회
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
