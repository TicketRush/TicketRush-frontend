import type {
  RefundProcessStatus,
  AdminRefundStats,
} from "@/types/domain/booking";
import {
  formatAdminShowSchedule,
  UNAVAILABLE_METRIC,
} from "@/utils/admin/formatAdminMetric";

export const REFUND_PROCESS_STATUS_LABEL: Record<RefundProcessStatus, string> =
  {
    IN_PROGRESS: "진행 중",
    COMPLETED: "완료",
    FAILED: "미해결 실패",
  };

/** 재시도는 미해결 실패와, 오래 멈춘 진행 중 건만 서버가 받는다. */
export function canRetryAdminRefund(status: RefundProcessStatus): boolean {
  return status === "FAILED" || status === "IN_PROGRESS";
}

export function filterAdminRefundList<T extends { refundStatus: RefundProcessStatus }>(
  items: readonly T[],
  refundStatus?: RefundProcessStatus,
): T[] {
  if (!refundStatus) return [...items];
  return items.filter((item) => item.refundStatus === refundStatus);
}

/** 카드 숫자는 목록 필터를 거치기 전의 모집단으로 센다. */
export function summarizeAdminRefunds(
  items: readonly { refundStatus: RefundProcessStatus }[],
): AdminRefundStats {
  let inProgressRefunds = 0;
  let completedRefunds = 0;
  let failedRefunds = 0;
  for (const item of items) {
    if (item.refundStatus === "IN_PROGRESS") inProgressRefunds += 1;
    else if (item.refundStatus === "COMPLETED") completedRefunds += 1;
    else failedRefunds += 1;
  }
  return {
    totalRefunds: inProgressRefunds + completedRefunds + failedRefunds,
    inProgressRefunds,
    completedRefunds,
    failedRefunds,
  };
}

/** 공연 일시는 Asia/Seoul 벽시계라 UTC로 다시 바꾸지 않는다. */
export function formatAdminRefundPerformance(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  const showDate = date?.trim();
  if (!showDate) return UNAVAILABLE_METRIC;
  const showTime = time?.trim();
  return formatAdminShowSchedule(showDate, showTime || undefined);
}
