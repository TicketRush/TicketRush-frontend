import type { PaymentStatus } from "@/types/domain/payment";

/** 토스 이동 중·백엔드 확정 중 — PENDING 취소(DELETE)를 보내면 안 되는 상태 */
export function isPaymentInFlight(status: PaymentStatus): boolean {
  return status === "REQUESTING" || status === "CONFIRMING";
}

export const CONFIRMING_LEAVE_MESSAGE =
  "결제 승인 처리 중입니다. 잠시만 기다려주세요.";

export const REQUESTING_LEAVE_MESSAGE =
  "결제창으로 이동 중입니다. 잠시만 기다려주세요.";

export function paymentInFlightLeaveMessage(status: PaymentStatus): string {
  return status === "REQUESTING"
    ? REQUESTING_LEAVE_MESSAGE
    : CONFIRMING_LEAVE_MESSAGE;
}
