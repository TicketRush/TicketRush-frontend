import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Square, Clock, ArrowLeft, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";
import StatCard from "@/components/admin/StatCard";
import AdminSeatMap from "@/components/admin/AdminSeatMap";
import AdminSeatDetailPanel from "@/components/admin/AdminSeatDetailPanel";
import {
  useAdminSeatMonitoring,
  useAdminSeatDetail,
  useAdminReleaseSeat,
  useAdminDashboard,
} from "@/hooks/admin/useAdmin";
import type { SeatWithStatus } from "@/types/domain/seat";

export default function AdminSeatMonitoringPage() {
  const navigate = useNavigate();
  const [selectedConcertId, setSelectedConcertId] = useState<number | null>(
    null,
  );
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);

  // 대시보드 데이터에서 공연 목록 활용
  const { data: dashboard } = useAdminDashboard();
  const concertList = dashboard?.concertList ?? [];

  const { data, isLoading, refetch, isFetching } = useAdminSeatMonitoring(
    selectedConcertId ?? undefined,
  );
  const { data: seatDetail, isLoading: detailLoading } = useAdminSeatDetail(
    selectedConcertId ?? undefined,
    selectedSeatId,
  );

  const releaseMutation = useAdminReleaseSeat(selectedConcertId ?? 0);

  function handleSeatClick(seat: SeatWithStatus) {
    if (seat.status === "AVAILABLE") {
      setSelectedSeatId(null);
      return;
    }
    setSelectedSeatId(seat.id);
  }

  async function handleRelease(seatId: number) {
    try {
      await releaseMutation.mutateAsync(seatId);
      toast.success("예약이 해제되었습니다.");
      setSelectedSeatId(null);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("예약 해제에 실패했습니다.");
      toast.error(err.message);
    }
  }

  function handleRefund() {
    toast.info("예매 내역 페이지로 이동합니다.");
    navigate("/admin/bookings");
  }

  function handleShowReserver() {
    toast.info("예매자 정보 페이지로 이동합니다.");
    navigate("/admin/bookings");
  }

  // ── 1단계: 공연 목록 화면 ────────────────────────
  if (!selectedConcertId) {
    return (
      <div className="p-8 space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
              SEAT MONITORING
            </span>
            <h1 className="text-3xl font-bold mt-2">
              좌석 현황 실시간 모니터링
            </h1>
            <p className="text-sm text-admin-text-secondary mt-1">
              공연별 좌석 상태를 실시간으로 확인하고 관리합니다
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

        {/* 공연 목록 테이블 */}
        <div className="bg-white border-2 border-[#D0D0D0] rounded-xl p-6">
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
            EVENT LISTS
          </span>
          <h3 className="text-base font-bold mb-4 text-gray-900">
            전체 공연 목록
          </h3>

          {concertList.length === 0 ? (
            <div className="text-center py-12 text-admin-text-secondary">
              공연 정보를 불러오는 중...
            </div>
          ) : (
            <table className="w-full text-sm text-left admin-table">
              <thead className="border-b border-admin-border">
                <tr className="text-xs text-admin-text-secondary">
                  <th className="py-3 px-3 text-left">ID</th>
                  <th className="py-3 px-3 text-left">공연명</th>
                  <th className="py-3 px-3 text-left">장르</th>
                  <th className="py-3 px-3 text-left">날짜</th>
                  <th className="py-3 px-3 text-left">판매/총</th>
                  <th className="py-3 px-3 text-left">점유율</th>
                  <th className="py-3 px-3 text-left">매출</th>
                  <th className="py-3 px-3 text-left">상태</th>
                </tr>
              </thead>
              <tbody>
                {concertList.map((c) => {
                  const rate = c.occupancyRate * 100;
                  const rateColor =
                    rate >= 100
                      ? "text-[#00C950]"
                      : rate >= 80
                        ? "text-[#1D7DFF]"
                        : "text-admin-text";
                  const isSoldOut = c.status === "SOLD_OUT";
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedConcertId(c.id)}
                      className="border-b border-admin-border/50 hover:bg-admin-border/30 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 font-mono text-xs">
                        E{String(c.id).padStart(3, "0")}
                      </td>
                      <td className="py-3 px-3 font-bold">{c.title}</td>
                      <td className="py-3 px-3">{c.genre}</td>
                      <td className="py-3 px-3">{c.date}</td>
                      <td className="py-3 px-3">
                        {c.soldSeats}/{c.totalSeats}
                      </td>
                      <td className={`py-3 px-3 font-bold ${rateColor}`}>
                        {rate.toFixed(0)}%
                      </td>
                      <td className="py-3 px-3">
                        ₩{c.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="px-3 py-1 rounded-md text-xs font-bold text-white"
                          style={{
                            backgroundColor: isSoldOut ? "#FB2C36" : "#00C950",
                          }}
                        >
                          {isSoldOut ? "매진" : "판매중"}
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

  // ── 2단계: 좌석 맵 화면 ─────────────────────────
  const selectedConcert = concertList.find((c) => c.id === selectedConcertId);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
            SEAT MONITORING
          </span>
          <h1 className="text-3xl font-bold mt-2">좌석 현황 실시간 모니터링</h1>
          <p className="text-sm text-admin-text-secondary mt-1">
            공연별 좌석 상태를 실시간으로 확인하고 관리합니다
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

      {/* 공연 선택 영역 */}
      <div className="bg-admin-card border border-admin-border rounded-xl p-4">
        <p className="text-xs text-admin-text-secondary mb-2">공연 선택</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={selectedConcert?.title ?? ""}
            onClick={() => {
              setSelectedConcertId(null);
              setSelectedSeatId(null);
            }}
            className="flex-1 bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm cursor-pointer"
          />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw
              size={14}
              className={isFetching ? "animate-spin" : ""}
            />
            새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={24} />}
          badge="TOTAL"
          badgeColor="purple"
          value={data?.stats.totalSeats ?? 0}
          label="전체 좌석"
        />
        <StatCard
          icon={
            <Square size={24} fill="#B9F8CF" stroke="#B9F8CF" strokeWidth={0} />
          }
          badge="AVAILABLE"
          badgeColor="green"
          value={data?.stats.availableSeats ?? 0}
          label="예매 가능"
        />
        <StatCard
          icon={
            <Square size={24} fill="#99A1AF" stroke="#99A1AF" strokeWidth={0} />
          }
          badge="SOLD"
          badgeColor="blue"
          value={data?.stats.soldSeats ?? 0}
          label="판매 완료"
        />
        <StatCard
          icon={<Clock size={24} />}
          badge="HOLDING"
          badgeColor="yellow"
          value={data?.stats.holdingSeats ?? 0}
          label="임시 예매 (타이머)"
        />
      </div>

      {/* 좌석 맵 + 상세 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-4">
            SEAT MAP
          </span>

          {isLoading ? (
            <div className="text-center py-20 text-admin-text-secondary">
              좌석 정보 불러오는 중...
            </div>
          ) : data ? (
            <>
              <AdminSeatMap
                seats={data.seats}
                selectedSeatId={selectedSeatId}
                onSeatClick={handleSeatClick}
                scale={0.7}
              />

              {/* 범례 */}
              <div className="flex justify-center gap-8 mt-6 pt-4 border-t border-admin-border">
                <p className="text-xs text-admin-text-secondary">범례</p>
                <LegendRow color="#B9F8CF" label="예매 가능" />
                <LegendRow color="#99A1AF" label="판매 완료" />
                <LegendRow color="#FFF085" label="진행중 (타이머)" />
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-red-400">
              좌석 정보를 불러올 수 없습니다.
            </div>
          )}
        </div>

        <div>
          <AdminSeatDetailPanel
            detail={seatDetail}
            isLoading={detailLoading}
            onRelease={handleRelease}
            onRefund={handleRefund}
            onShowReserver={handleShowReserver}
          />
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
      <span className="text-admin-text-secondary">{label}</span>
    </div>
  );
}
