// 결제 cancel(환불) mutation
//
// 백엔드: POST /api/v1/payment/{paymentId}/cancel
//
// 변경사항 (백엔드 스펙 반영):
//   - mutation 인자: paymentKey (string) → { paymentId, reason } 객체
//   - 백엔드가 취소 사유(reason)를 required로 요구
//
// PAYMENT_409_004 코드값은 errorCodes에 있다.
// 이 훅은 아직 화면에 없다. 결제 취소 화면이 붙으면 bookingNumber를 넘겨
// 예매 환불과 같은 세션 기억으로 버튼을 끈다 (#370).
import { useMutation } from "@tanstack/react-query";
import { paymentCancelApi } from "@/api/payments";

interface PaymentCancelPayload {
  paymentId: number;
  reason: string;
}

export function usePaymentCancel() {
  return useMutation({
    mutationFn: (payload: PaymentCancelPayload) =>
      paymentCancelApi(payload.paymentId, { reason: payload.reason }),
  });
}
