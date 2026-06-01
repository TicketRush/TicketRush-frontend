// 결제 도메인 타입
// 가상 스펙 — 백엔드 payment-service swagger 확정 시 정렬 필요
// 결제 SDK 인터페이스는 Toss/포트원 컨벤션 참고

export type PaymentStatus =
  | "IDLE" // 초기 상태
  | "REQUESTING" // 결제 SDK 호출 중
  | "CONFIRMING" // 백엔드 confirm 진행 중
  | "SUCCESS" // 성공
  | "FAILED" // 실패
  | "EXPIRED" // 타이머 만료
  | "CANCELLED"; // 사용자가 명시적으로 취소

export type PaymentMethod = "CARD" | "KAKAOPAY" | "NAVERPAY" | "TOSSPAY";

// ── 결제 init (가상) ─────────────────────────────────
export interface PaymentInitRequest {
  bookingNumber: string;
  method: PaymentMethod;
}

export interface PaymentInitResponse {
  paymentKey: string;
  /** 보통 bookingNumber와 동일 */
  orderId: string;
  amount: number;
  /** ISO datetime */
  expiresAt: string;
}

// ── 결제 confirm (가상) ──────────────────────────────
export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  amount: number;
  paidAt: string;
  bookingNumber: string;
}

// ── 결제 cancel (가상) ───────────────────────────────
export interface PaymentCancelRequest {
  paymentKey: string;
  reason: string;
}
