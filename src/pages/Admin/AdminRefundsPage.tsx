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
import { AlertTriangle, Clock3, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import {
  useRefundFailedBookings,
  useRefundingStuckBookings,
  useRetryRefund,
} from "@/hooks/admin/useAdminRefunds";
import type { AdminRefundBookingListItem } from "@/types/domain/booking";

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
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
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
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ backgroundColor: "#FB2C36" }}
            >
              <AlertTriangle size={20} className="text-white" />
            </div>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-white"
              style={{ backgroundColor: "#FB2C36" }}
            >
              FAILED
            </span>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: "#FB2C36" }}>
            {failed.data?.items.length ?? 0}
          </p>
          <p className="text-xs text-admin-text-secondary">
            환불 처리 실패 (현재 페이지)
          </p>
        </div>

        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ backgroundColor: "#F59E0B" }}
            >
              <Clock3 size={20} className="text-white" />
            </div>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-white"
              style={{ backgroundColor: "#F59E0B" }}
            >
              STUCK
            </span>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: "#F59E0B" }}>
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
    <div className="bg-white border-2 border-[#D0D0D0] rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
        {title}
      </span>
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
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
          <table className="w-full text-sm text-left admin-table">
            <thead className="border-b border-admin-border">
              <tr className="text-xs text-admin-text-secondary">
                <th className="py-3 px-3 text-left">예매번호</th>
                <th className="py-3 px-3 text-left">공연명</th>
                <th className="py-3 px-3 text-left">좌석</th>
                <th className="py-3 px-3 text-left">사용자ID</th>
                <th className="py-3 px-3 text-left">상태</th>
                <th className="py-3 px-3 text-left">{dateColumnLabel}</th>
                <th className="py-3 px-3 text-left">재시도</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr
                  key={b.bookingNumber}
                  className="border-b border-admin-border/50 hover:bg-admin-border/30"
                >
                  <td className="py-3 px-3 font-mono text-xs text-blue-400">
                    {b.bookingNumber}
                  </td>
                  <td className="py-3 px-3 font-bold">{b.performanceTitle}</td>
                  <td className="py-3 px-3">{b.seatNumber}</td>
                  <td className="py-3 px-3 text-xs text-admin-text-secondary">
                    #{b.userId}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-3 py-1 rounded-md text-xs font-bold text-white bg-gray-500">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-admin-text-secondary">
                    {(() => {
                      const dt = dateAccessor(b);
                      return dt ? new Date(dt).toLocaleString("ko-KR") : "-";
                    })()}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onRetry(b.bookingNumber)}
                      disabled={retryPending}
                      className="px-3 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1"
                      style={{ backgroundColor: "#2563EB" }}
                    >
                      <RotateCcw size={12} /> 재시도
                    </button>
                  </td>
                </tr>
              ))}
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
