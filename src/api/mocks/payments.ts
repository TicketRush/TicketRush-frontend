// Mock 결제
import { mockDelay, mockError, shouldThrow } from "./_helpers";
import type {
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentConfirmRequest,
  PaymentConfirmResponse,
} from "@/types/domain/payment";
import { _updateMockBookingStatus, _findMockBooking } from "./bookings";

export async function mockPaymentInit(
  req: PaymentInitRequest,
): Promise<PaymentInitResponse> {
  await mockDelay(300);

  const booking = _findMockBooking(req.bookingNumber);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  if (booking!.status !== "PENDING") {
    await mockError(
      "BOOKING_INVALID_STATE",
      "결제 가능한 상태가 아닙니다.",
    );
  }

  return {
    paymentKey: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    orderId: req.bookingNumber,
    amount: booking!.price,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export async function mockPaymentConfirm(
  req: PaymentConfirmRequest,
): Promise<PaymentConfirmResponse> {
  await mockDelay(800); // 결제 confirm은 시간이 좀 걸림

  // 3% 확률로 결제 실패 시뮬레이션
  if (shouldThrow(0.03)) {
    await mockError(
      "PAYMENT_CONFIRM_FAILED",
      "결제 승인에 실패했습니다. 카드사에 문의해주세요.",
      100,
    );
  }

  const booking = _findMockBooking(req.orderId);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  if (booking!.price !== req.amount) {
    await mockError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 일치하지 않습니다.",
    );
  }

  const paidAt = new Date().toISOString();
  _updateMockBookingStatus(req.orderId, "CONFIRMED", paidAt);

  return {
    paymentKey: req.paymentKey,
    orderId: req.orderId,
    amount: req.amount,
    paidAt,
    bookingNumber: req.orderId,
  };
}

export async function mockPaymentCancel(_paymentKey: string): Promise<void> {
  await mockDelay(400);
  // mock에서는 별도 처리 없음 (실 API에선 환불 처리)
}
