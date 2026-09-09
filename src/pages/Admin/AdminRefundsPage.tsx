// 환불 모니터링 — booking-service 실 API (2026-07-18 swagger-ui 실측으로 확인)
//
// ⚠️ 이전에는 useAdminBookings({status:"CANCELED"}) mock 데이터를 재활용해
// "환불 내역"을 흉내내고 있었음. 실제 백엔드에는 그런 범용 "취소 예매 목록"
// 환불 API가 없고, 대신 다음 2개의 구체적인 모니터링 엔드포인트만 존재:
//   - GET /booking/admin/bookings/refund-failed    (환불 처리 자체가 실패한 건)
//   - GET /booking/admin/bookings/refunding-stuck  (REFUNDING 상태로 오래 멈춰있는 건)
//   - POST /booking/admin/{bookingNumber}/refund-retry (재시도)
//
// ⚠️ 응답에 사용자 이름/이메일이 없음 (userId만 존재, 조회 가능한 공개 API 없음).
// 공연명/좌석번호는 performance/seat 서비스에서 aggregation (api/bookings.ts).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, RefreshCw, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import {
  useRefundFailedBookings,
  useRefundingStuckBookings,
  useRetryRefund,
} from "@/hooks/admin/useAdminRefunds";
import type { AdminRefundBookingListItem } from "@/types/domain/booking";
import {
  formatAdminDateTime,
  formatAdminText,
} from "@/utils/admin/formatAdminMetric";

const STATUS_STYLES: Record<string, { label: string; bg: string }> = {
  CONFIRMED: { label: "완료", bg: "#00C950" },
  CANCELED: { label: "취소", bg: "#FB2C36" },
  PENDING: { label: "대기", bg: "#FBBF24" },
  EXPIRED: { label: "만료", bg: "#9CA3AF" },
  REFUNDING: { label: "환불 중", bg: "#2B7FFF" },
  REFUNDED: { label: "환불 완료", bg: "#6B7280" },
};

const PAGE_SIZE = 10;

export default function AdminRefundsPage() {
  const navigate = useNavigate();
  const [failedPage, setFailedPage] = useState(0);
  const [stuckPage, setStuckPage] = useState(0);

  const failed = useRefundFailedBookings({ page: failedPage, size: PAGE_SIZE });
  const stuck = useRefundingStuckBookings({ page: stuckPage, size: PAGE_SIZE });
  const retryMutation = useRetryRefund();

  async function handleRetry(bookingNumber: string) {
    try {
      await retryMutation.mutateAsync(bookingNumber);
      toast.success(`${bookingNumber} 환불 재시도를 요청했습니다.`);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("재시도 요청에 실패했습니다.");
      toast.error(err.message);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-1 rounded">
            REFUND MONITORING
          </span>
          <h1 className="text-3xl font-bold mt-2">환불 모니터링</h1>
          <p className="text-sm text-admin-text-secondary mt-1">
            환불 처리가 실패했거나 오래 지연된 예매를 조회하고 재시도합니다
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

      {/* 통계 카드 2개 */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <RefreshCw size={24} className="text-admin-status-cancelled" />
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-red-500/20 text-red-300">
              FAILED
            </span>
          </div>
          <p className="text-3xl font-bold mb-1 text-admin-status-cancelled">
            {failed.data?.items.length ?? 0}
          </p>
          <p className="text-xs text-admin-text-secondary">
            환불 처리 실패 (현재 페이지)
          </p>
        </div>

        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <Clock3 size={24} className="text-admin-kpi-revenue" />
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-orange-500/20 text-orange-300">
              STUCK
            </span>
          </div>
          <p className="text-3xl font-bold mb-1 text-admin-kpi-revenue">
            {stuck.data?.items.length ?? 0}
          </p>
          <p className="text-xs text-admin-text-secondary">
            환불 지연(멈춤) (현재 페이지)
          </p>
        </div>
      </div>

      <RefundTable
        title="환불 처리 실패"
        subtitle="환불 요청 자체가 실패해 재시도가 필요한 예매입니다"
        isLoading={failed.isLoading}
        isError={failed.isError}
        onReload={() => void failed.refetch()}
        items={failed.data?.items ?? []}
        dateColumnLabel="실패 시각"
        dateAccessor={(item) => item.refundFailedAt}
        onRetry={handleRetry}
        retryPending={retryMutation.isPending}
        page={failedPage}
        hasNext={failed.data?.hasNext ?? false}
        onPageChange={setFailedPage}
      />

      <RefundTable
        title="환불 지연 (REFUNDING 멈춤)"
        subtitle="환불 진행 중 상태(REFUNDING)로 오래 멈춰있는 예매입니다"
        isLoading={stuck.isLoading}
        isError={stuck.isError}
        onReload={() => void stuck.refetch()}
        items={stuck.data?.items ?? []}
        dateColumnLabel="최종 업데이트"
        dateAccessor={(item) => item.updatedAt}
        onRetry={handleRetry}
        retryPending={retryMutation.isPending}
        page={stuckPage}
        hasNext={stuck.data?.hasNext ?? false}
        onPageChange={setStuckPage}
      />
    </div>
  );
}

function RefundTable({
  title,
  subtitle,
  isLoading,
  isError,
  onReload,
  items,
  dateColumnLabel,
  dateAccessor,
  onRetry,
  retryPending,
  page,
  hasNext,
  onPageChange,
}: {
  title: string;
  subtitle: string;
  isLoading: boolean;
  isError: boolean;
  onReload: () => void;
  items: AdminRefundBookingListItem[];
  dateColumnLabel: string;
  dateAccessor: (item: AdminRefundBookingListItem) => string | null;
  onRetry: (bookingNumber: string) => void;
  retryPending: boolean;
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="bg-admin-card border-2 border-admin-dark-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-0.5 rounded inline-block mb-2">
        {title}
      </span>
      <h3 className="text-base font-bold text-admin-text">{title}</h3>
      <p className="text-xs text-admin-text-secondary mb-4">{subtitle}</p>

      {isLoading ? (
        <div className="text-center py-12 text-admin-text-secondary">
          불러오는 중...
        </div>
      ) : isError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-admin-text-secondary">
            목록을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={onReload}
            className="px-4 py-2 rounded-md text-xs font-bold text-white inline-flex items-center gap-1"
            style={{ backgroundColor: "#2563EB" }}
          >
            <RotateCcw size={12} /> 다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-admin-text-secondary">
          해당하는 예매가 없습니다.
        </div>
      ) : (
        <>
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  예매번호
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  공연명
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  좌석
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  사용자ID
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  상태
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  {dateColumnLabel}
                </th>
                <th className="py-3 px-3 text-xs font-semibold text-admin-text-secondary text-center">
                  재시도
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const s = STATUS_STYLES[b.status] ?? STATUS_STYLES.PENDING;
                return (
                  <tr
                    key={b.bookingNumber}
                    className="border-b border-admin-border/50 hover:bg-admin-border/30"
                  >
                    <td className="py-3 px-3 font-mono text-xs text-blue-400">
                      {b.bookingNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-admin-text">
                      {formatAdminText(b.performanceTitle)}
                    </td>
                    <td className="py-3 px-3 text-admin-text">
                      {formatAdminText(b.seatNumber)}
                    </td>
                    <td className="py-3 px-3 text-xs text-admin-text-secondary">
                      #{b.userId}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-block px-3 py-1 rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: s.bg }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-admin-text-secondary">
                      {formatAdminDateTime(dateAccessor(b))}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => onRetry(b.bookingNumber)}
                        disabled={retryPending}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold text-white bg-admin-register disabled:opacity-40"
                      >
                        <RotateCcw size={12} /> 재시도
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-md text-xs bg-admin-border disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              className="px-3 py-1.5 rounded-md text-xs bg-admin-border disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}
