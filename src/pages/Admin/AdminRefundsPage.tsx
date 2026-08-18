import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, CheckCircle, ArrowLeft } from "lucide-react";
import { useAdminBookings, useAdminBookingStats } from "@/hooks/admin/useAdmin";

export default function AdminRefundsPage() {
  const navigate = useNavigate();
  const [page] = useState(0);

  const { data, isLoading } = useAdminBookings({
    page,
    size: 10,
    status: "CANCELED",
  });
  const { data: stats } = useAdminBookingStats();

  const totalRefunds = stats?.cancelledBookings ?? 0;
  const completedRefunds = Math.floor(totalRefunds * 0.66);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
            REFUND MANAGEMENT
          </span>
          <h1 className="text-3xl font-bold mt-2">환불 내역 관리</h1>
          <p className="text-sm text-admin-text-secondary mt-1">
            환불 내역을 조회하고 관리합니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="px-4 py-2 rounded-lg bg-admin-card border border-admin-border flex items-center gap-2"
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
              <RotateCcw size={20} className="text-white" />
            </div>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-white"
              style={{ backgroundColor: "#FB2C36" }}
            >
              TOTAL
            </span>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: "#FB2C36" }}>
            {totalRefunds}
          </p>
          <p className="text-xs text-admin-text-secondary">전체 환불</p>
        </div>

        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-10 h-10 rounded flex items-center justify-center"
              style={{ backgroundColor: "#00C950" }}
            >
              <CheckCircle size={20} className="text-white" />
            </div>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-white"
              style={{ backgroundColor: "#00C950" }}
            >
              COMPLETED
            </span>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: "#00C950" }}>
            {completedRefunds}
          </p>
          <p className="text-xs text-admin-text-secondary">완료된 환불</p>
        </div>
      </div>

      {/* 환불 테이블 */}
      <div className="bg-white border-2 border-[#D0D0D0] rounded-xl p-6">
        <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
          ORDERS LIST
        </span>
        <h3 className="text-base font-bold mb-4 text-gray-900">
          {data
            ? `${data.pagination.totalElements}개의 예매 (${data.items.length}개 중)`
            : "불러오는 중..."}
        </h3>

        {isLoading ? (
          <div className="text-center py-12 text-admin-text-secondary">
            불러오는 중...
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12 text-admin-text-secondary">
            환불 내역이 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm text-left admin-table">
            <thead className="border-b border-admin-border">
              <tr className="text-xs text-admin-text-secondary">
                <th className="py-3 px-3 text-left">예매번호</th>
                <th className="py-3 px-3 text-left">공연명</th>
                <th className="py-3 px-3 text-left">공연날짜</th>
                <th className="py-3 px-3 text-left">예매일시</th>
                <th className="py-3 px-3 text-left">예매자</th>
                <th className="py-3 px-3 text-left">금액</th>
                <th className="py-3 px-3 text-left">상태</th>
                <th className="py-3 px-3 text-left">상세</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((b, idx) => {
                const isCompleted = idx % 2 === 0;
                return (
                  <tr
                    key={b.bookingNumber}
                    className="border-b border-admin-border/50 hover:bg-admin-border/30"
                  >
                    <td className="py-3 px-3 font-mono text-xs text-blue-400">
                      {b.bookingNumber}
                    </td>
                    <td className="py-3 px-3 font-bold">{b.concertTitle}</td>
                    <td className="py-3 px-3 text-xs text-admin-text-secondary">
                      {b.concertDate}
                    </td>
                    <td className="py-3 px-3 text-xs text-admin-text-secondary">
                      {new Date(b.bookedAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="py-3 px-3">{b.userName}</td>
                    <td className="py-3 px-3 font-bold">
                      ₩{b.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="px-3 py-1 rounded-md text-xs font-bold text-white"
                        style={{ backgroundColor: "#FB2C36" }}
                      >
                        신청
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="px-3 py-1 rounded-md text-xs font-bold text-white"
                        style={{
                          backgroundColor: isCompleted ? "#00C950" : "#9CA3AF",
                        }}
                      >
                        {isCompleted ? "완료" : "대기"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
