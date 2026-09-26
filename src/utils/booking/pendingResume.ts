import type { PaymentStatus } from "@/types/domain/payment";
import type { TimerRunStatus } from "@/utils/booking/decidePendingTimerRestore";
import { shouldKeepPendingOnPath } from "@/utils/booking/isPendingBookingFlowPath";

/** 타이머가 남은 PENDING만 결제 화면으로 되돌린다 (#369). */
export function isResumablePaymentStatus(status: PaymentStatus): boolean {
  return status === "IDLE" || status === "FAILED";
}

export function pendingResumePath(
  performanceId: number,
  paymentStatus: PaymentStatus,
): string {
  if (paymentStatus === "FAILED") {
    return `/concerts/${performanceId}/payment/failed`;
  }
  return `/concerts/${performanceId}/payment/confirm`;
}

/**
 * 확인/결제 화면은 자체 타이머·만료 처리를 한다.
 * 플로우 밖(홈·상세·마이페이지)에서만 레이아웃이 만료 취소를 맡는다 (#369).
 */
export function shouldExpirePendingOffFlow(pathname: string): boolean {
  return !shouldKeepPendingOnPath(pathname);
}

/**
 * 내 예매 목록이 아니라 전역 배너로만 이어가기를 보여 준다.
 * HOLD·타이머가 남아 있고, 확인 화면에 필요한 좌석 컨텍스트가 있을 때만 true.
 */
export function shouldShowPendingResumeBanner(input: {
  bookingNumber: string | null;
  paymentStatus: PaymentStatus;
  timerStatus: TimerRunStatus;
  /** 서버 마감 시각을 아직 확인하지 못했다. 확인 화면에서 다시 조회한다. */
  timerUnconfirmed?: boolean;
  performanceId: number | null | undefined;
  hasSelectedSeat: boolean;
  pathname: string;
}): boolean {
  if (!input.bookingNumber) return false;
  if (!isResumablePaymentStatus(input.paymentStatus)) return false;
  const timerKnown = input.timerStatus === "running";
  if (!timerKnown && !input.timerUnconfirmed) return false;
  if (input.performanceId == null || input.performanceId <= 0) return false;
  if (shouldKeepPendingOnPath(input.pathname)) return false;
  if (input.paymentStatus === "IDLE" && !input.hasSelectedSeat) return false;
  return true;
}
