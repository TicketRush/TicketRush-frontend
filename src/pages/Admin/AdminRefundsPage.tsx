// 환불 관리 — 진행·완료·미해결 실패 통합 목록 (#397 / BE #675)
//
//   GET  /booking/admin/refunds
//   GET  /booking/admin/refunds/stats
//   POST /booking/admin/{bookingNumber}/refund-retry
// 통계 카드는 목록 필터와 무관한 전체 모집단이다. CANCELED는 환불로 세지 않는다.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import { ApiError } from "@/api/errors/errorMapper";
import {
  useAdminRefundList,
  useAdminRefundStats,
  useRetryRefund,
} from "@/hooks/admin/useAdminRefunds";
import type {
  AdminRefundListItem,
  RefundProcessStatus,
} from "@/types/domain/booking";
import {
  REFUND_PROCESS_STATUS_LABEL,
  canRetryAdminRefund,
  formatAdminRefundPerformance,
} from "@/utils/admin/adminRefunds";
import {
  formatAdminCount,
  formatAdminDateTime,
  formatAdminText,
  formatAdminWon,
} from "@/utils/admin/formatAdminMetric";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<RefundProcessStatus, { bg: string }> = {
  IN_PROGRESS: { bg: "#2B7FFF" },
  COMPLETED: { bg: "#6B7280" },
  FAILED: { bg: "#FB2C36" },
};

const FILTERS: { status?: RefundProcessStatus; label: string; stat: keyof StatsShape }[] =
  [
    { label: "전체 환불", stat: "totalRefunds" },
    { status: "IN_PROGRESS", label: "진행 중", stat: "inProgressRefunds" },
    { status: "COMPLETED", label: "완료", stat: "completedRefunds" },
    { status: "FAILED", label: "미해결 실패", stat: "failedRefunds" },
  ];

type StatsShape = {
  totalRefunds: number;
  inProgressRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
};

export default function AdminRefundsPage() {
  useDocumentTitle("환불 관리");

  const navigate = useNavigate();
  const [refundStatus, setRefundStatus] = useState<
    RefundProcessStatus | undefined
  >(undefined);
  const [page, setPage] = useState(0);

  const stats = useAdminRefundStats();
  const list = useAdminRefundList({ page, size: PAGE_SIZE, refundStatus });
  const retryMutation = useRetryRefund();

  function selectFilter(next: RefundProcessStatus | undefined) {
    setRefundStatus(next);
    setPage(0);
  }

  async function handleRetry(bookingNumber: string) {
    try {
      await retryMutation.mutateAsync(bookingNumber);
      toast.success(`${bookingNumber} 환불 재시도를 요청했습니다.`);
    } catch (error: unknown) {
      toast.error(ApiError.fromUnknown(error).message);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-1 rounded">
            REFUNDS
          </span>
          <h1 className="text-3xl font-bold mt-2">환불 관리</h1>
          <p className="text-sm text-admin-text-secondary mt-1">
            진행 중, 완료, 미해결 실패를 한 목록에서 봅니다. 결제 전 취소와
            만료는 포함하지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="px-4 py-2 rounded-lg bg-admin-dark-bg border-2 border-admin-dark-border flex items-center gap-2"
        >
          <ArrowLeft size={16} /> 대시보드
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FILTERS.map((filter) => {
          const selected = refundStatus === filter.status;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={selected}
              onClick={() => selectFilter(filter.status)}
              className={`bg-admin-card rounded-xl p-6 text-left border-2 ${
                selected ? "border-admin-register" : "border-admin-border"
              }`}
            >
              <p className="text-xs text-admin-text-secondary mb-2">
                {filter.label}
              </p>
              <p className="text-3xl font-bold text-admin-text">
                {formatAdminCount(stats.data?.[filter.stat])}
              </p>
            </button>
          );
        })}
      </div>

      <RefundTable
        isLoading={list.isLoading}
        isError={list.isError}
        onReload={() => void list.refetch()}
        items={list.data?.items ?? []}
        onRetry={handleRetry}
        retryPending={retryMutation.isPending}
        page={page}
        hasNext={list.data?.hasNext ?? false}
        onPageChange={setPage}
      />
    </div>
  );
}

function RefundTable({
  isLoading,
  isError,
  onReload,
  items,
  onRetry,
  retryPending,
  page,
  hasNext,
  onPageChange,
}: {
  isLoading: boolean;
  isError: boolean;
  onReload: () => void;
  items: AdminRefundListItem[];
  onRetry: (bookingNumber: string) => void;
  retryPending: boolean;
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="bg-admin-card border-2 border-admin-dark-border rounded-xl p-6">
      <h3 className="text-base font-bold text-admin-text">환불 목록</h3>
      <p className="text-xs text-admin-text-secondary mb-4">
        금액은 결제액입니다. 진행 중 건은 오래 멈춘 경우에만 재시도됩니다.
      </p>

      {isLoading ? (
        <div className="text-center py-12 text-admin-text-secondary">
          불러오는 중...
        </div>
      ) : isError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-red-400">목록을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={onReload}
            className="px-4 py-2 rounded-md text-xs font-bold text-white inline-flex items-center gap-1 bg-admin-register"
          >
            <RotateCcw size={12} /> 다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-admin-text-secondary">
          해당하는 환불이 없습니다.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead>
                <tr className="border-b border-admin-border">
                  {[
                    "예매번호",
                    "공연명",
                    "공연 일시",
                    "예매일시",
                    "예매자",
                    "결제 금액",
                    "상태",
                    "재시도",
                  ].map((label) => (
                    <th
                      key={label}
                      className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const style = STATUS_STYLES[item.refundStatus];
                  return (
                    <tr
                      key={item.bookingNumber}
                      className="border-b border-admin-border/50 hover:bg-admin-border/30"
                    >
                      <td className="py-3 px-3 font-mono text-xs text-blue-400">
                        {item.bookingNumber}
                      </td>
                      <td className="py-3 px-3 font-bold text-admin-text">
                        {formatAdminText(item.performanceTitle)}
                      </td>
                      <td className="py-3 px-3 text-xs text-admin-text-secondary">
                        {formatAdminRefundPerformance(
                          item.performanceDate,
                          item.performanceTime,
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-admin-text-secondary">
                        {formatAdminDateTime(item.bookedAt)}
                      </td>
                      <td className="py-3 px-3 text-admin-text">
                        {formatAdminText(item.bookerName)}
                      </td>
                      <td className="py-3 px-3 text-admin-text">
                        {formatAdminWon(item.paymentAmount)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-block px-3 py-1 rounded-md text-xs font-bold text-white"
                          style={{ backgroundColor: style.bg }}
                        >
                          {REFUND_PROCESS_STATUS_LABEL[item.refundStatus]}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {canRetryAdminRefund(item.refundStatus) ? (
                          <button
                            type="button"
                            onClick={() => onRetry(item.bookingNumber)}
                            disabled={retryPending}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold text-white bg-admin-register disabled:opacity-40"
                          >
                            <RotateCcw size={12} /> 재시도
                          </button>
                        ) : (
                          <span className="text-xs text-admin-text-secondary">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-md text-xs text-admin-text bg-admin-border disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              className="px-3 py-1.5 rounded-md text-xs text-admin-text bg-admin-border disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}
