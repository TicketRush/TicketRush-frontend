// 결제 init mutation
import { useMutation } from "@tanstack/react-query";
import { paymentInitApi } from "@/api/payments";
import type { PaymentInitRequest } from "@/types/domain/payment";

export function usePaymentInit() {
  return useMutation({
    mutationFn: (req: PaymentInitRequest) => paymentInitApi(req),
  });
}
