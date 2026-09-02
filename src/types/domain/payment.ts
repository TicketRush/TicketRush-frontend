// 결제 도메인 타입
//
// 백엔드 payment-service swagger (2026-06-30) 스펙 반영
//
// 백엔드 endpoint:
//   POST /api/v1/payment/confirm  → PaymentConfirmRequest → PaymentConfirmResponse
//   POST /api/v1/payment/{id}/cancel → PaymentCancelRequest → PaymentCancelResponse
//   GET  /api/v1/payment          → PaymentSummaryResponse[]
//   GET  /api/v1/payment/{id}     → PaymentDetailResponse

/**
 * 결제 수단 — 백엔드 enum과 일치.
 *
 * ⚠️ 소셜 로그인의 provider (KAKAO/NAVER/GOOGLE)와 다름.
 *   결제는 TOSS(토스 페이먼츠) 추가되어 있고 GOOGLE 없음.
 */
export type PaymentMethod = "KAKAO" | "NAVER" | "TOSS";

/**
 * 백엔드 결제 상태 — 백엔드 enum과 일치.
 *
 *   PENDING: 결제 진행 중 (사용자 SDK 창)
 *   COMPLETED: 결제 완료
 *   CANCELED: 취소됨 (환불)
 *   FAILED: 결제 실패
 */
export type BackendPaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELED"
  | "FAILED";

/**
 * 프론트 결제 상태 머신 — paymentStore에서 사용.
 *
 * 상태 전이:
 *   IDLE → REQUESTING → CONFIRMING → SUCCESS
 *                                  → FAILED
 *   IDLE → EXPIRED (타이머 만료)
 *
 * ⚠️ 이건 UI 흐름을 표현하는 상태이며 백엔드 결제 상태(BackendPaymentStatus)와 다름.
 *   REQUESTING: SDK 호출 중 (사용자 결제 창). PENDING DELETE 금지.
 *   CONFIRMING: SDK 완료 후 백엔드 confirm 진행 중. DELETE 금지 + 이탈 경고.
 *   SUCCESS: 백엔드 confirm 성공
 *   FAILED: SDK 실패 or confirm 실패
 *   EXPIRED: 서버 expires_at 기준 타이머 만료
 */
export type PaymentStatus =
  | "IDLE"
  | "REQUESTING"
  | "CONFIRMING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

/** 환불 상태 — 백엔드 enum과 일치 */
export type RefundStatus = "PENDING" | "COMPLETED" | "FAILED";

// ── 결제 confirm 요청/응답 (백엔드 확정) ────────
/**
 * 백엔드 PaymentConfirmRequest 대응.
 *
 * ⚠️ 필드명은 camelCase (백엔드도 camelCase).
 * ⚠️ provider는 KAKAO/NAVER/TOSS.
 */
export interface PaymentConfirmRequest {
  bookingId: number;
  seatId: number;
  provider: PaymentMethod;
  amount: number;
  /** PG사가 발급한 결제 키 */
  paymentKey: string;
}

/** 백엔드 PaymentConfirmResponse 대응 */
export interface PaymentConfirmResponse {
  paymentId: number;
  status: BackendPaymentStatus;
  paidAt: string;
}

// ── 결제 취소(환불) 요청/응답 ────────────────────
export interface PaymentCancelRequest {
  reason: string;
}

export interface PaymentCancelResponse {
  paymentId: number;
  status: BackendPaymentStatus;
  refundId: number;
  refundedAmount: number;
  canceledAt: string;
}

// ── 결제 내역 조회 ───────────────────────────────
/** 백엔드 PaymentSummaryResponse 대응 (목록) */
export interface PaymentSummary {
  paymentId: number;
  bookingId: number;
  provider: PaymentMethod;
  amount: number;
  status: BackendPaymentStatus;
  paidAt: string;
}

/** 백엔드 PaymentDetailResponse 대응 (단건 상세) */
export interface PaymentDetail extends PaymentSummary {
  approvalNumber?: string;
  refund?: {
    refundId: number;
    price: number;
    status: RefundStatus;
    confirmedAt: string;
  };
}
