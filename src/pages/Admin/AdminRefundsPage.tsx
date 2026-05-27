import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, CheckSquare, ArrowLeft } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import Pagination from "@/components/admin/Pagination";
import { useAdminBookings, useAdminBookingStats } from "@/hooks/admin/useAdmin";

export default function AdminRefundsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAdminBookings({
    page,
    size: 10,
    status: "CANCELLED",
  });
  const { data: stats } = useAdminBookingStats();

  // mock: 환불 완료 비율 (실제는 별도 API 필요)
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
        <StatCard
          icon={<RotateCcw size={24} className="text-red-400" />}
          badge="TOTAL"
          badgeColor="red"
          value={totalRefunds}
          label="전체 환불"
        />
        <StatCard
          icon={<CheckSquare size={24} className="text-green-400" />}
          badge="COMPLETED"
          badgeColor="green"
          value={completedRefunds}
          label="완료된 환불"
        />
      </div>

      {/* 환불 테이블 */}
      <div className="bg-admin-card border border-admin-border rounded-xl p-6">
        <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
          ORDERS LIST
        </span>
        <h3 className="text-base font-bold mb-4">
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
          <>
            <table className="w-full text-sm">
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
                  // mock: 짝수 인덱스는 "완료", 홀수는 "대기"
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
                        <span className="px-3 py-1 rounded-md text-xs font-bold bg-[#FB2C36] text-white">
                          신청
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isCompleted ? (
                          <span className="px-3 py-1 rounded-md text-xs font-bold bg-[#00C950] text-white">
                            완료
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-600 text-white">
                            대기
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              pageIndex={page}
              totalPages={data.pagination.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
