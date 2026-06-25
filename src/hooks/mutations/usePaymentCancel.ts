// 결제 cancel mutation
import { useMutation } from "@tanstack/react-query";
import { paymentCancelApi } from "@/api/payments";

export function usePaymentCancel() {
  return useMutation({
    mutationFn: (paymentKey: string) => paymentCancelApi(paymentKey),
  });
}
