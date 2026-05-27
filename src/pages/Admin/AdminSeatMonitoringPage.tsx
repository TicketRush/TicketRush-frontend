// 좌석 현황 실시간 모니터링 — 이미지 5, 6
// 좌측: 좌석 맵, 우측: 좌석 상세 정보 (sticky)

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
} from "@/hooks/admin/useAdmin";
import { useConcerts } from "@/hooks/queries/useConcerts";
import type { SeatWithStatus } from "@/types/domain/seat";

export default function AdminSeatMonitoringPage() {
  const navigate = useNavigate();
  const [performanceId, setPerformanceId] = useState<number | undefined>();
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);

  // 공연 선택 드롭다운
  const { data: concertsData } = useConcerts({ size: 50 });
  const concerts = concertsData?.pages.flatMap((p) => p.items) ?? [];

  const { data, isLoading, refetch, isFetching } =
    useAdminSeatMonitoring(performanceId);
  const { data: seatDetail, isLoading: detailLoading } = useAdminSeatDetail(
    performanceId,
    selectedSeatId,
  );

  const releaseMutation = useAdminReleaseSeat(performanceId ?? 0);

  function handleSeatClick(seat: SeatWithStatus) {
    // 예약 가능 좌석은 선택해도 의미 없음
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
    } catch (err: any) {
      toast.error(err?.message ?? "예약 해제에 실패했습니다.");
    }
  }

  function handleRefund(seatId: number) {
    // 좌석 → bookingNumber 매핑은 백엔드에서 알아야 함
    // 일단 임시로 알림만
    toast.info("환불 처리 화면으로 이동합니다 (구현 예정)");
    navigate("/admin/bookings");
  }

  function handleShowReserver(seatId: number) {
    toast.info("예매자 정보 화면으로 이동합니다 (구현 예정)");
    navigate("/admin/bookings");
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
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

      {/* 공연 선택 */}
      <div className="bg-admin-card border border-admin-border rounded-xl p-4">
        <p className="text-xs text-admin-text-secondary mb-2">공연 선택</p>
        <div className="flex gap-2">
          <select
            value={performanceId ?? ""}
            onChange={(e) =>
              setPerformanceId(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            className="flex-1 bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">공연을 선택하세요</option>
            {concerts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.date})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={!performanceId || isFetching}
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

      {/* 공연 미선택 상태 */}
      {!performanceId && (
        <div className="bg-admin-card border border-admin-border rounded-xl p-12 text-center text-admin-text-secondary">
          공연을 선택하면 좌석 현황이 표시됩니다
        </div>
      )}

      {/* 공연 선택 + 데이터 로드 완료 */}
      {performanceId && (
        <>
          {/* 좌석 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users size={24} />}
              badge="TOTAL"
              badgeColor="purple"
              value={data?.stats.totalSeats ?? 0}
              label="전체 좌석"
            />
            <StatCard
              icon={<Square size={24} fill="#B9F8CF" stroke="#B9F8CF" />}
              badge="AVAILABLE"
              badgeColor="green"
              value={data?.stats.availableSeats ?? 0}
              label="예매 가능"
            />
            <StatCard
              icon={<Square size={24} fill="#99A1AF" stroke="#99A1AF" />}
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
              label="진행중 (타이머)"
            />
          </div>

          {/* 좌석 맵 + 상세 패널 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            {/* 좌석 맵 */}
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
                  />

                  {/* 범례 */}
                  <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-admin-border text-xs">
                    <LegendRow color="#B9F8CF" label="예매 가능" />
                    <LegendRow color="#99A1AF" label="판매 완료" />
                    <LegendRow color="#FFF085" label="진행중 (타이머)" />
                  </div>

                  {/* 타이머 진행중 안내 */}
                  {data.stats.holdingSeats > 0 && (
                    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded p-3 mt-4 text-xs text-yellow-300 flex items-center gap-2">
                      <Clock size={14} />
                      <span>
                        {data.stats.holdingSeats}개의 좌석이 예약 진행중입니다.
                        5분 후 자동으로 해제됩니다.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-red-400">
                  좌석 정보를 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* 우측 패널 */}
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
        </>
      )}
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
      <span className="text-admin-text-secondary">{label}</span>
    </div>
  );
}
