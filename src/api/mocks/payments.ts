// Mock 결제
//
// 백엔드 payment-service swagger (2026-06-30) 스펙 반영.
//
// 주요 변경:
//   - mockPaymentInit 완전 삭제 (백엔드에 별도 init API 없음, SDK가 직접 처리)
//   - mockPaymentConfirm 시그니처 완전 변경:
//     Before: { paymentKey, orderId, amount }
//     After:  { bookingId, seatId, paymentKey, amount, provider }
//   - PaymentConfirmResponse: { paymentId, status, paidAt }
//   - 결제 내역 조회 mock 신규 추가 (백엔드 GET /payment, /payment/:id)

import { mockDelay, mockError, shouldThrow } from "./_helpers";
import type {
  PaymentConfirmRequest,
  PaymentConfirmResponse,
  PaymentCancelRequest,
  PaymentCancelResponse,
  PaymentSummary,
  PaymentDetail,
} from "@/types/domain/payment";
import { _updateMockBookingStatus, _findMockBookingById } from "./bookings";

export async function mockPaymentConfirm(
  req: PaymentConfirmRequest,
): Promise<PaymentConfirmResponse> {
  await mockDelay(800);

  if (shouldThrow(0.03)) {
    await mockError(
      "PAYMENT_CONFIRM_FAILED",
      "결제 승인에 실패했습니다. 카드사에 문의해주세요.",
      100,
    );
  }

  const booking = _findMockBookingById(req.bookingId);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  if (booking!.price !== req.amount) {
    await mockError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 일치하지 않습니다.",
    );
  }
  if (booking!.seatId !== req.seatId) {
    await mockError("PAYMENT_SEAT_MISMATCH", "좌석 정보가 일치하지 않습니다.");
  }

  const paidAt = new Date().toISOString();
  _updateMockBookingStatus(booking!.bookingNumber, "CONFIRMED", paidAt);

  return {
    paymentId: Date.now(),
    status: "COMPLETED",
    paidAt,
  };
}

/** 결제 취소(환불) — 백엔드 POST /api/v1/payment/{paymentId}/cancel */
export async function mockPaymentCancel(
  paymentId: number,
  _req: PaymentCancelRequest,
): Promise<PaymentCancelResponse> {
  await mockDelay(400);
  return {
    paymentId,
    status: "CANCELED",
    refundId: Date.now(),
    refundedAmount: 0,
    canceledAt: new Date().toISOString(),
  };
}

/** 결제 내역 조회 — GET /payment */
export async function mockGetPaymentHistory(): Promise<PaymentSummary[]> {
  await mockDelay(400);
  return [];
}

/** 결제 단건 상세 — GET /payment/{paymentId} */
export async function mockGetPaymentDetail(
  paymentId: number,
): Promise<PaymentDetail> {
  await mockDelay(300);
  return {
    paymentId,
    bookingId: 1,
    amount: 132000,
    provider: "TOSS",
    status: "COMPLETED",
    paidAt: new Date().toISOString(),
  };
}
