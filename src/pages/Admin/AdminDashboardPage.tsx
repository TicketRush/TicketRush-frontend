import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowLeft,
  Ticket,
  RotateCcw,
  Monitor,
  ArrowRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import StatCard from "@/components/admin/StatCard";
import RevenueChart from "@/components/admin/RevenueChart";
import GenrePieChart from "@/components/admin/GenrePieChart";
import SalesChart from "@/components/admin/SalesChart";
import AdminConcertTable from "@/components/admin/AdminConcertTable";
import AdminCalendar from "@/components/admin/AdminCalendar";
import { useAdminDashboard, useDeleteConcert } from "@/hooks/admin/useAdmin";

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAdminDashboard();
  const deleteMutation = useDeleteConcert();

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    start: Date;
    end: Date;
  }>(() => {
    const today = new Date();
    return { start: today, end: today };
  });

  const filteredRevenue = useMemo(() => {
    if (!data) return [];
    const startStr = toLocalDateKey(selectedRange.start);
    const endStr = toLocalDateKey(selectedRange.end);
    return data.dailyRevenue.filter(
      (d) => d.date >= startStr && d.date <= endStr,
    );
  }, [data, selectedRange]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success("공연이 삭제되었습니다.");
      setDeleteTarget(null);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("삭제에 실패했습니다.");
      toast.error(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-admin-text-secondary">
          대시보드 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-red-400">
          대시보드 데이터를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg border-2 border-admin-dark-border px-2 py-1 rounded">
            ADMIN MODE
          </span>
          <h1 className="text-3xl font-bold mt-2">관리자 대시보드</h1>
          <p className="text-sm text-admin-text-secondary mt-1">
            공연 현황 및 통계
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/concerts/new")}
            className="px-4 py-2 rounded-lg bg-admin-register text-white font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> 공연 등록
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-admin-dark-bg border-2 border-admin-dark-border flex items-center gap-2"
          >
            <ArrowLeft size={16} /> 사용자 모드로
          </button>
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar size={24} />}
          badge="TOTAL"
          badgeColor="purple"
          iconClassName="text-admin-kpi-events"
          value={data.stats.totalConcerts}
          label="등록된 공연"
        />
        <StatCard
          icon={<Users size={24} />}
          badge="SOLD"
          badgeColor="green"
          iconClassName="text-admin-kpi-tickets"
          value={data.stats.soldTickets.toLocaleString()}
          label="판매된 티켓"
        />
        <StatCard
          icon={<DollarSign size={24} />}
          badge="REVENUE"
          badgeColor="orange"
          iconClassName="text-admin-kpi-revenue"
          value={`₩${data.stats.totalRevenue.toLocaleString()}`}
          label="총 매출"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          badge="RATE"
          badgeColor="purple"
          iconClassName="text-admin-kpi-occupancy"
          value={`${(data.stats.averageOccupancyRate * 100).toFixed(0)}%`}
          label="전체 좌석 판매율"
        />
      </div>

      {/* 관리 기능 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ManagementCard
          icon={<Ticket size={28} />}
          title="예매 내역 관리"
          desc="전체 티켓 예매 내역을 조회하고 관리합니다"
          linkLabel="관리 화면으로 이동"
          onClick={() => navigate("/admin/bookings")}
        />
        <ManagementCard
          icon={<RotateCcw size={28} />}
          title="환불 내역 관리"
          desc="환불 내역을 조회하고 관리합니다"
          linkLabel="환불 내역 화면으로 이동"
          onClick={() => navigate("/admin/refunds")}
        />
        <ManagementCard
          icon={<Monitor size={28} />}
          title="좌석 현황 모니터링"
          desc="공연별 좌석 상태를 실시간으로 확인합니다"
          linkLabel="모니터링 화면으로 이동"
          onClick={() => navigate("/admin/seat-monitoring")}
        />
      </div>

      {/* 달력 + 매출 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <AdminCalendar
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
        />
        <RevenueChart data={filteredRevenue} />
      </div>

      {/* 장르 차트 */}
      <GenrePieChart data={data.genreRevenue} />

      {/* 공연별 판매 현황 */}
      <SalesChart data={data.concertSales} />

      {/* 전체 공연 목록 */}
      <div className="bg-admin-card-bg border-2 border-admin-card-border rounded-xl p-6">
        <span className="text-[10px] font-bold tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded inline-block mb-2">
          EVENTS LIST
        </span>
        <h3 className="text-base font-bold mb-4 text-gray-900">
          전체 공연 목록
        </h3>
        <AdminConcertTable
          data={data.concertList}
          onEdit={(id) => navigate(`/admin/concerts/${id}/edit`)}
          onDelete={(id) => setDeleteTarget(id)}
        />
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-card border border-admin-border rounded-xl p-6 max-w-md w-full">
            <h3 className="font-bold mb-2">공연을 삭제하시겠습니까?</h3>
            <p className="text-sm text-admin-text-secondary mb-4">
              삭제된 공연은 복구할 수 없습니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="py-2 rounded bg-admin-border"
                disabled={deleteMutation.isPending}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2 rounded text-white font-bold bg-admin-cancel"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagementCard({
  icon,
  title,
  desc,
  linkLabel,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  linkLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-admin-card border border-admin-border rounded-xl p-6 text-left hover:border-primary/50 transition"
    >
      <div className="text-admin-text-secondary mb-4">{icon}</div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-admin-text-secondary mb-4">{desc}</p>
      <span className="text-sm text-admin-accent flex items-center gap-1">
        {linkLabel} <ArrowRight size={14} />
      </span>
    </button>
  );
}
