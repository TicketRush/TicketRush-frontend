// 관리자 좌석 모니터링 (#169 / #336 / #361)
//
// KPI: GET /api/v1/seat/{id}/seat-counts (useSeatCounts). 맵은 admin monitoring.
// 상세 bookingNumber로 예매 단건을 조합.
// #336: 공개 SSE(seat-status/stream)로 맵·KPI 캐시를 패치. 재조회 중에도 기존 화면 유지.
// #361: 연결 상태, /admin/seat-monitoring/:id URL, 목록 숫자 재조회, HOLD 만료 시 맵 유지.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Users, Square, Clock, ArrowLeft, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";
import StatCard from "@/components/admin/StatCard";
import AdminSeatMap from "@/components/admin/AdminSeatMap";
import AdminSeatDetailPanel from "@/components/admin/AdminSeatDetailPanel";
import {
  adminKeys,
  useAdminSeatMonitoring,
  useAdminSeatDetail,
  useAdminReleaseSeat,
  useAdminConcerts,
} from "@/hooks/admin/useAdmin";
import { useSeatCounts } from "@/hooks/queries/useSeats";
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useSeatEventStream } from "@/hooks/seat/useSeatEventStream";
import { LEGACY_HOLD_BOOKING_NUMBER } from "@/api/admin";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { ApiError } from "@/api/errors/errorMapper";
import type { SeatStatus, SeatWithStatus } from "@/types/domain/seat";
import type { AdminConcertItem } from "@/types/domain/admin";
import type { ConcertStatus, Genre } from "@/types/domain/concert";
import Pagination from "@/components/admin/Pagination";
import { resolveSelectedSeatLiveUpdate } from "@/utils/admin/adminSeatLiveUpdate";
import { parseAdminPerformanceId } from "@/utils/admin/parseAdminPerformanceId";
import {
  SEAT_STREAM_CONNECTION_LABEL,
  type SeatStreamConnectionStatus,
} from "@/utils/seat/seatStreamConnection";
import {
  formatAdminCount,
  formatAdminOccupancy,
  formatAdminSeats,
  formatAdminShowSchedule,
  formatAdminWon,
} from "@/utils/admin/formatAdminMetric";
import { isInitialQueryPending } from "@/utils/query/isInitialQueryPending";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";

const MONITORING_PAGE_SIZE = 50;

const STATUS_LABELS: Record<ConcertStatus, string> = {
  UPCOMING: "예정",
  ON_SALE: "판매중",
  CLOSED: "종료",
  CANCELED: "취소",
};

const GENRE_LABELS: Record<Genre, string> = {
  CONCERT: "콘서트",
  MUSICAL: "뮤지컬",
  CLASSIC: "클래식",
  JAZZ: "재즈",
  FESTIVAL: "페스티벌",
  FANMEETING: "팬미팅",
  BALLET: "발레",
};

interface MonitoringLocationState {
  concert?: AdminConcertItem;
}

export default function AdminSeatMonitoringPage() {
  useDocumentTitle("좌석 모니터링");

  const { performanceId: rawPerformanceId } = useParams<{
    performanceId?: string;
  }>();
  const performanceId = parseAdminPerformanceId(rawPerformanceId);

  if (rawPerformanceId && performanceId == null) {
    return <Navigate to="/admin/seat-monitoring" replace />;
  }
  if (performanceId == null) {
    return <AdminSeatMonitoringList />;
  }
  return <AdminSeatMonitoringMapRoute performanceId={performanceId} />;
}

function AdminSeatMonitoringList() {
  const navigate = useNavigate();
  const [listPage, setListPage] = useState(0);

  const {
    data: concerts,
    isLoading: concertsLoading,
    isError: concertsError,
    isPlaceholderData: concertsPlaceholder,
  } = useAdminConcerts(
    {
      page: listPage,
      size: MONITORING_PAGE_SIZE,
    },
    { refetchOnMount: "always" },
  );
  const concertList = concerts?.items ?? [];

  // ── 1단계: 공연 목록 화면 ────────────────────────
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
          className="px-4 py-2 rounded-lg bg-admin-dark-bg border-2 border-admin-dark-border flex items-center gap-2"
        >
          <ArrowLeft size={16} /> 대시보드
        </button>
      </div>

      {/* 공연 목록 테이블 */}
      <div className="bg-admin-surface border-2 border-admin-surface-border rounded-xl p-6">
        <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
          EVENT LISTS
        </span>
        <h3 className="text-base font-bold mb-4 text-gray-900">
          전체 공연 목록
        </h3>

        {concertsError && concertList.length === 0 ? (
          <div className="text-center py-12 text-red-400">
            공연 목록을 불러올 수 없습니다.
          </div>
        ) : (concertsLoading && concertList.length === 0) ||
          concertsPlaceholder ? (
          <div className="text-center py-12 text-admin-text-secondary">
            공연 정보를 불러오는 중...
          </div>
        ) : concertList.length === 0 ? (
          <div className="text-center py-12 text-admin-text-secondary">
            등록된 공연이 없습니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm admin-table">
              <thead className="border-b border-admin-border">
                <tr className="text-xs text-admin-text-secondary">
                  <th className="py-3 px-3 text-center whitespace-nowrap">ID</th>
                  <th className="py-3 px-3 text-left">공연명</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">장르</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">날짜</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">판매/총</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">점유율</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">매출</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">상태</th>
                </tr>
              </thead>
              <tbody>
                {concertList.map((c) => {
                  const rate =
                    c.occupancyRate == null ? null : c.occupancyRate * 100;
                  const rateColor =
                    rate == null
                      ? "text-admin-text-secondary"
                      : rate >= 100
                        ? "text-[#00C950]"
                        : rate >= 80
                          ? "text-[#1D7DFF]"
                          : "text-admin-text";
                  const isSoldOut =
                    c.soldOut === true ||
                    (c.totalSeats != null &&
                      c.soldSeats != null &&
                      c.totalSeats > 0 &&
                      c.soldSeats >= c.totalSeats);
                  const isCanceled = c.status === "CANCELED";
                  const statusLabel = isCanceled
                    ? "취소"
                    : isSoldOut
                      ? "매진"
                      : (STATUS_LABELS[c.status] ?? "판매중");
                  const statusColor = isCanceled
                    ? "#FB2C36"
                    : isSoldOut
                      ? "#FB2C36"
                      : c.status === "ON_SALE"
                        ? "#00C950"
                        : "#6B7280";
                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        navigate(`/admin/seat-monitoring/${c.id}`, {
                          state: {
                            concert: c,
                          } satisfies MonitoringLocationState,
                        });
                      }}
                      className="border-b border-admin-border/50 hover:bg-admin-border/30 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 text-center font-mono text-xs whitespace-nowrap">
                        E{String(c.id).padStart(3, "0")}
                      </td>
                      <td className="py-3 px-3 text-left font-bold">{c.title}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {c.genreName ?? GENRE_LABELS[c.genre] ?? c.genre}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums whitespace-nowrap">
                        {formatAdminShowSchedule(c.date, c.showTime)}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums whitespace-nowrap">
                        {formatAdminSeats(c.soldSeats, c.totalSeats)}
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-bold tabular-nums whitespace-nowrap ${rateColor}`}
                      >
                        {formatAdminOccupancy(c.occupancyRate)}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums whitespace-nowrap">
                        {formatAdminWon(c.revenue)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className="px-3 py-1 rounded-md text-xs font-bold text-white"
                          style={{
                            backgroundColor: statusColor,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {concerts?.pagination ? (
              <Pagination
                pageIndex={listPage}
                totalPages={concerts.pagination.totalPages}
                onChange={setListPage}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function AdminSeatMonitoringMapRoute({
  performanceId,
}: {
  performanceId: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const stateConcert = (location.state as MonitoringLocationState | null)
    ?.concert;
  const concertFromState =
    stateConcert?.id === performanceId ? stateConcert : undefined;
  const { data: concertDetail, isError: concertDetailError } = useConcertDetail(
    concertFromState ? undefined : performanceId,
  );
  const concertTitle =
    concertFromState?.title ??
    concertDetail?.title ??
    (concertDetailError ? `공연 ${performanceId}` : "");

  return (
    <AdminSeatMonitoringMap
      key={performanceId}
      performanceId={performanceId}
      concertTitle={concertTitle}
      onChangeConcert={() => navigate("/admin/seat-monitoring")}
    />
  );
}

export function AdminSeatMonitoringMap({
  performanceId,
  concertTitle,
  onChangeConcert,
}: {
  performanceId: number;
  concertTitle: string;
  onChangeConcert: () => void;
}) {
  const navigate = useNavigate();
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevSelectedRef = useRef<{
    seatId: number | null;
    status: SeatStatus | undefined;
  }>({ seatId: null, status: undefined });

  const {
    data: monitoring,
    isLoading,
    isError: monitoringError,
    refetch: refetchMonitoring,
    isFetching: monitoringFetching,
    isFetchedAfterMount: monitoringFetchedAfterMount,
  } = useAdminSeatMonitoring(performanceId);
  const {
    data: seatCounts,
    isError: countsError,
    refetch: refetchCounts,
  } = useSeatCounts(performanceId, true, {
    fresh: true,
    refetchOnWindowFocus: false,
  });
  const {
    data: seatDetail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useAdminSeatDetail(performanceId, selectedSeatId);

  const releaseMutation = useAdminReleaseSeat(performanceId);
  const mapInitialPending = isInitialQueryPending(
    isLoading,
    monitoringFetching,
    monitoringFetchedAfterMount,
  );

  const { connectionStatus } = useSeatEventStream(performanceId, true, {
    getMapQueryKey: adminKeys.seatMonitoring,
    syncUserSelection: false,
  });

  const selectedSeatStatus = monitoring?.seats.find(
    (seat) => seat.id === selectedSeatId,
  )?.status;

  useEffect(() => {
    const prev = prevSelectedRef.current;
    const action = resolveSelectedSeatLiveUpdate({
      selectedSeatId,
      selectedStatus: selectedSeatStatus,
      prevSeatId: prev.seatId,
      prevStatus: prev.status,
    });
    if (action === "clear" || selectedSeatId == null) {
      if (action === "clear") setSelectedSeatId(null);
      prevSelectedRef.current = { seatId: null, status: undefined };
      return;
    }
    if (action === "refetch") void refetchDetail();
    prevSelectedRef.current = {
      seatId: selectedSeatId,
      status: selectedSeatStatus,
    };
  }, [selectedSeatId, selectedSeatStatus, refetchDetail]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void Promise.all([
      refetchCounts(),
      refetchMonitoring(),
      selectedSeatId ? refetchDetail() : Promise.resolve(),
    ]).finally(() => setIsRefreshing(false));
  }, [refetchCounts, refetchMonitoring, refetchDetail, selectedSeatId]);

  const handleHoldExpired = useCallback(() => {
    if (selectedSeatId == null) return;
    void refetchDetail();
  }, [selectedSeatId, refetchDetail]);

  function handleSeatClick(seat: SeatWithStatus) {
    if (seat.status === "AVAILABLE") {
      setSelectedSeatId(null);
      return;
    }
    if (selectedSeatId === seat.id) {
      void refetchDetail();
      return;
    }
    setSelectedSeatId(seat.id);
  }

  function goToBookings(
    bookingNumber: string | undefined,
    intent: "refund" | "reserver",
  ) {
    const number = bookingNumber?.trim();
    if (!number) {
      toast.info("예매 번호가 없어 예매 내역에서 찾을 수 없습니다.");
      navigate("/admin/bookings");
      return;
    }

    const params = new URLSearchParams({ bookingNumber: number });
    if (intent === "refund") params.set("intent", "refund");
    toast.info(
      intent === "refund"
        ? "예매 내역에서 환불할 예매를 엽니다."
        : "예매자 정보를 확인합니다.",
    );
    navigate(`/admin/bookings?${params}`);
  }

  async function handleRelease(seatId: number, bookingNumber?: string) {
    const trimmed = bookingNumber?.trim();
    const releaseBookingNumber = trimmed || LEGACY_HOLD_BOOKING_NUMBER;

    try {
      await releaseMutation.mutateAsync({
        seatId,
        bookingNumber: releaseBookingNumber,
      });
      toast.success("예약이 해제되었습니다.");
      setSelectedSeatId(null);
    } catch (error: unknown) {
      const err = ApiError.fromUnknown(error);
      toast.error(err.message);

      if (err.code === ERROR_CODES.SEAT_NOT_HELD) {
        handleRefresh();
        setSelectedSeatId(null);
        return;
      }
      if (err.code === ERROR_CODES.SEAT_SOLD_NOT_RELEASABLE) {
        handleRefresh();
        if (trimmed) goToBookings(trimmed, "refund");
        return;
      }
      if (err.code === ERROR_CODES.SEAT_RELEASE_CONFLICT) {
        handleRefresh();
      }
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-1 rounded">
            SEAT MONITORING
          </span>
          <h1 className="text-3xl font-bold mt-2">좌석 현황 실시간 모니터링</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-admin-text-secondary">
              공연별 좌석 상태를 실시간으로 확인하고 관리합니다
            </p>
            <ConnectionStatusBadge status={connectionStatus} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="px-4 py-2 rounded-lg bg-admin-dark-bg border-2 border-admin-dark-border flex items-center gap-2"
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
            value={concertTitle}
            onClick={onChangeConcert}
            className="flex-1 bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-sm cursor-pointer"
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
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
          value={formatAdminCount(seatCounts?.totalCount)}
          label="전체 좌석"
        />
        <StatCard
          icon={
            <Square
              size={24}
              className="fill-admin-seat-available text-admin-seat-available"
              strokeWidth={0}
            />
          }
          badge="AVAILABLE"
          badgeColor="green"
          value={formatAdminCount(seatCounts?.availableCount)}
          label="예매 가능"
        />
        <StatCard
          icon={
            <Square
              size={24}
              className="fill-admin-seat-sold text-admin-seat-sold"
              strokeWidth={0}
            />
          }
          badge="SOLD"
          badgeColor="blue"
          value={formatAdminCount(seatCounts?.soldCount)}
          label="판매 완료"
        />
        <StatCard
          icon={<Clock size={24} />}
          badge="HOLDING"
          badgeColor="yellow"
          value={formatAdminCount(seatCounts?.holdCount)}
          label="임시 예매 (타이머)"
        />
      </div>

      {countsError ? (
        <p className="text-sm text-red-400">
          좌석 요약(seat-counts)을 불러올 수 없습니다.
        </p>
      ) : null}
      {monitoringError && monitoring ? (
        <p className="text-sm text-red-400">
          좌석 맵을 다시 불러오지 못했습니다. 새로고침 후 다시 시도하세요.
        </p>
      ) : null}

      {/* 좌석 맵 + 상세 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
          <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-4">
            SEAT MAP
          </span>

          {mapInitialPending && !monitoring ? (
            <div className="text-center py-20 text-admin-text-secondary">
              좌석 정보 불러오는 중...
            </div>
          ) : monitoring && !monitoring.layoutReady ? (
            <div className="text-center py-20 text-admin-text-secondary">
              좌석 배치가 아직 생성되지 않았습니다.
            </div>
          ) : monitoring ? (
            <>
              <AdminSeatMap
                seats={monitoring.seats}
                layout={monitoring.layout}
                selectedSeatId={selectedSeatId}
                onSeatClick={handleSeatClick}
                scale={0.7}
              />

              {/* 범례 */}
              <div className="flex justify-center gap-8 mt-6 pt-4 border-t border-admin-border">
                <p className="text-xs text-admin-text-secondary">범례</p>
                <LegendRow swatch="bg-admin-seat-available" label="예매 가능" />
                <LegendRow swatch="bg-admin-seat-sold" label="판매 완료" />
                <LegendRow
                  swatch="bg-admin-seat-holding"
                  label="임시예매 (타이머)"
                />
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
            isError={detailError}
            isReleasing={releaseMutation.isPending}
            mapStatus={selectedSeatStatus}
            onRelease={handleRelease}
            onRefund={(bookingNumber) => goToBookings(bookingNumber, "refund")}
            onShowReserver={(bookingNumber) =>
              goToBookings(bookingNumber, "reserver")
            }
            onHoldExpired={handleHoldExpired}
          />
        </div>
      </div>
    </div>
  );
}

function LegendRow({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-4 h-4 rounded ${swatch}`} />
      <span className="text-admin-text-secondary">{label}</span>
    </div>
  );
}

const CONNECTION_BADGE_TONE: Record<
  SeatStreamConnectionStatus,
  { wrap: string; dot: string }
> = {
  connecting: {
    wrap: "bg-admin-border text-admin-text-secondary",
    dot: "bg-admin-text-secondary",
  },
  live: {
    wrap: "bg-green-500/15 text-[#00C950]",
    dot: "bg-[#00C950]",
  },
  reconnecting: {
    wrap: "bg-yellow-500/15 text-yellow-600",
    dot: "bg-yellow-400",
  },
  polling: {
    wrap: "bg-blue-500/15 text-[#1D7DFF]",
    dot: "bg-[#1D7DFF]",
  },
};

function ConnectionStatusBadge({
  status,
}: {
  status: SeatStreamConnectionStatus;
}) {
  const tone = CONNECTION_BADGE_TONE[status];
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${tone.wrap}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {SEAT_STREAM_CONNECTION_LABEL[status]}
    </span>
  );
}
