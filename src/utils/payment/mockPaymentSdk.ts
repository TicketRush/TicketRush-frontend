// Mock 결제 SDK — Toss/포트원 SDK 인터페이스 흉내
// Sprint 8 Feat #22-1에서 실제 SDK로 교체

import type { PaymentMethod } from "@/types/domain/payment";

interface RequestPaymentParams {
  paymentKey: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  customerName?: string;
  onSuccess: () => void;
  onFail: (reason: string) => void;
  onCancel: () => void;
}

/**
 * 실제 결제 SDK 호출을 흉내냄.
 * window.confirm으로 사용자 결정 받기:
 *   확인 → 결제 성공 → onSuccess()
 *   취소 → 결제 실패 → onFail()
 *
 * 실제 SDK 예시 (Toss):
 *   await tossPayments.requestPayment(method, { paymentKey, orderId, amount, ... })
 */
export function mockRequestPayment(params: RequestPaymentParams): void {
  setTimeout(() => {
    const message =
      `[MOCK 결제]\n` +
      `주문번호: ${params.orderId}\n` +
      `금액: ${params.amount.toLocaleString()}원\n` +
      `수단: ${params.method}\n\n` +
      `확인 → 결제 성공\n` +
      `취소 → 결제 실패`;

    const choice = window.confirm(message);

    if (choice) {
      params.onSuccess();
    } else {
      params.onFail("사용자가 결제를 취소했습니다.");
    }
  }, 500);
}
