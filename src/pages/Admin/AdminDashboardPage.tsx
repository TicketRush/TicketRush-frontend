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
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import StatCard from "@/components/admin/StatCard";
import RevenueChart from "@/components/admin/RevenueChart";
import GenrePieChart from "@/components/admin/GenrePieChart";
import SalesChart from "@/components/admin/SalesChart";
import AdminConcertTable from "@/components/admin/AdminConcertTable";
import AdminCalendar from "@/components/admin/AdminCalendar";
import Pagination from "@/components/admin/Pagination";
import {
  useAdminConcerts,
  useAdminDashboard,
  useDeleteConcert,
} from "@/hooks/admin/useAdmin";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { mapErrorToMessage } from "@/api/errors/errorMapper";
import type {
  AdminConcertItem,
  ConcertSalesStatus,
} from "@/types/domain/admin";
import {
  defaultDashboardRange,
  fillDailyRevenueGaps,
  isDashboardPeriodWithinLimit,
  toLocalDateKey,
} from "@/utils/admin/dashboardPeriod";
import {
  formatAdminCount,
  formatAdminOccupancy,
  formatAdminWon,
} from "@/utils/admin/formatAdminMetric";

const CONCERT_PAGE_SIZE = 10;

function toSalesStatus(items: AdminConcertItem[]): ConcertSalesStatus[] {
  return items.map((item) => ({
    concertId: item.id,
    title: item.title,
    genre: item.genre,
    genreName: item.genreName,
    date: item.date,
    soldSeats: item.soldSeats,
    totalSeats: item.totalSeats,
    occupancyRate: item.occupancyRate,
    revenue: item.revenue,
    isSoldOut: item.soldOut,
  }));
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [concertPage, setConcertPage] = useState(0);
  const [selectedRange, setSelectedRange] = useState(defaultDashboardRange);

  const from = toLocalDateKey(selectedRange.start);
  const to = toLocalDateKey(selectedRange.end);
  const { data, isLoading, isError, isPlaceholderData } = useAdminDashboard({
    from,
    to,
  });
  const {
    data: concertPageData,
    isLoading: concertsLoading,
    isError: concertsError,
    isPlaceholderData: concertsPlaceholder,
  } = useAdminConcerts({ page: concertPage, size: CONCERT_PAGE_SIZE });
  const deleteMutation = useDeleteConcert();

  const chartRevenue = useMemo(() => {
    if (data?.dailyRevenue == null) return undefined;
    return fillDailyRevenueGaps(data.dailyRevenue, from, to);
  }, [data?.dailyRevenue, from, to]);

  function handleRangeChange(range: { start: Date; end: Date }) {
    if (!isDashboardPeriodWithinLimit(range.start, range.end)) {
      toast.error(
        mapErrorToMessage(ERROR_CODES.PERFORMANCE_DASHBOARD_PERIOD_TOO_LONG),
      );
      return;
    }
    setSelectedRange(range);
  }

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

  const stats = data?.stats;
  const concertItems = concertPageData?.items ?? [];
  const concertPagination = concertPageData?.pagination;

  useEffect(() => {
    if (concertPagination == null) return;
    const totalPages = concertPagination.totalPages;
    if (concertPage > 0 && concertPage >= totalPages) {
      setConcertPage(Math.max(0, totalPages - 1));
    }
  }, [concertPage, concertPagination]);

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

      {isError && !data ? (
        <div className="text-sm text-red-400">
          대시보드 집계를 불러올 수 없습니다. 공연 목록은 아래를 확인하세요.
        </div>
      ) : null}

      {/* 통계 카드 4개 — 기간과 무관. 생략된 필드는 "-" */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar size={24} />}
          badge="TOTAL"
          badgeColor="purple"
          iconClassName="text-admin-kpi-events"
          value={
            isLoading && !stats ? "..." : formatAdminCount(stats?.totalConcerts)
          }
          label="등록된 공연"
          hint="판매 전·취소 포함"
        />
        <StatCard
          icon={<Users size={24} />}
          badge="SOLD"
          badgeColor="green"
          iconClassName="text-admin-kpi-tickets"
          value={
            isLoading && !stats ? "..." : formatAdminCount(stats?.soldTickets)
          }
          label="판매된 티켓"
          hint="전체 기간"
        />
        <StatCard
          icon={<DollarSign size={24} />}
          badge="REVENUE"
          badgeColor="orange"
          iconClassName="text-admin-kpi-revenue"
          value={
            isLoading && !stats ? "..." : formatAdminWon(stats?.totalRevenue)
          }
          label="총 매출"
          hint="전체 기간"
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          badge="RATE"
          badgeColor="purple"
          iconClassName="text-admin-kpi-occupancy"
          value={
            isLoading && !stats
              ? "..."
              : formatAdminOccupancy(stats?.averageOccupancyRate)
          }
          label="전체 좌석 판매율"
          hint="판매중·종료 가중평균"
        />
      </div>

      {stats?.revenueComplete === false ? (
        <p className="text-xs text-amber-600">
          결제 금액이 없는 확정 예매
          {stats.missingAmountBookings != null
            ? ` ${stats.missingAmountBookings.toLocaleString()}건`
            : ""}
          이 있어 표시된 총 매출이 실제보다 작을 수 있습니다.
        </p>
      ) : null}

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

      {/* 달력 + 매출 차트 — 기간은 일별 매출에만 적용 */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <AdminCalendar
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
          onRangeReject={() =>
            toast.error(
              mapErrorToMessage(
                ERROR_CODES.PERFORMANCE_DASHBOARD_PERIOD_TOO_LONG,
              ),
            )
          }
        />
        <RevenueChart
          data={chartRevenue}
          isLoading={(isLoading && !data) || isPlaceholderData}
        />
      </div>

      {/* 장르 차트 — 기간과 무관 */}
      <GenrePieChart
        data={data?.genreRevenue}
        isLoading={isLoading && !data}
      />

      {/* 공연별 판매 현황 + 전체 공연 목록 — GET /performance/admin */}
      {concertsError && !concertPageData ? (
        <div className="text-sm text-red-400">
          공연 목록을 불러올 수 없습니다.
        </div>
      ) : (concertsLoading && !concertPageData) || concertsPlaceholder ? (
        <div className="py-12 text-center text-sm text-gray-500">
          공연 목록을 불러오는 중...
        </div>
      ) : (
        <>
          <SalesChart data={toSalesStatus(concertItems)} />

          <div className="bg-admin-card-bg border-2 border-admin-card-border rounded-xl p-6">
            <span className="text-[10px] font-bold tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded inline-block mb-2">
              EVENTS LIST
            </span>
            <h3 className="text-base font-bold mb-4 text-gray-900">
              전체 공연 목록
            </h3>
            <AdminConcertTable
              data={concertItems}
              onEdit={(id) => navigate(`/admin/concerts/${id}/edit`)}
              onDelete={(id) => setDeleteTarget(id)}
            />
            {concertPagination ? (
              <Pagination
                pageIndex={concertPage}
                totalPages={concertPagination.totalPages}
                onChange={setConcertPage}
              />
            ) : null}
          </div>
        </>
      )}

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
