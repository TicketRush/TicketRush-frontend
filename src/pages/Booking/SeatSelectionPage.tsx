// 좌석 선택 페이지
//
// 백엔드 스펙 반영 변경:
//   - handleSeatClick의 seat 객체 필드명 변경 (label→seatNumber, layoutId→seatLayoutId)
//   - seat 삭제 (백엔드 스펙엔 좌석 단위 가격 없음)
//   - totalAmount 계산: selectedSeat 제거, currentConcert만 사용
// - 2026-08-07 (#181):
//   - URL 직접 진입 시 상세 canBook과 동일 조건으로 가드
//   - 불가 시 /concerts/:id 로 replace redirect
//   - 허용 시 detail로 concertStore hydrate (직접 진입 대비)
import { useEffect, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import SeatMap from "@/components/seat/SeatMap";
import SeatLegend from "@/components/seat/SeatLegend";
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useSeats, useSeatCounts } from "@/hooks/queries/useSeats";
import { useSeatEventStream } from "@/hooks/seat/useSeatEventStream";
import { useHoldSeat } from "@/hooks/mutations/useHoldSeat";
import useSeatStore from "@/stores/reservation/seatStore";
import { useTimerStore } from "@/stores/reservation/timerStore";
import { useConcertStore } from "@/stores/reservation/concertStore";
import { toast } from "react-toastify";
import type { SeatWithStatus } from "@/types/domain/seat";
import {
  canBookConcert,
  shouldFetchSeatCounts,
} from "@/utils/concert/canBookConcert";

export default function SeatSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const performanceId = id ? Number(id) : undefined;

  const selectedSeat = useSeatStore((s) => s.selectedSeat);
  const toggleSeat = useSeatStore((s) => s.toggleSeat);
  const startTimer = useTimerStore((s) => s.startTimer);
  const setConcert = useConcertStore((s) => s.setConcert);
  const currentConcert = useConcertStore((s) => s.currentConcert);

  const {
    data: concert,
    isLoading: concertLoading,
    isError: concertError,
  } = useConcertDetail(performanceId);

  const shouldFetchSeats =
    !!concert && shouldFetchSeatCounts(concert.status);
  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isError: seatCountsError,
  } = useSeatCounts(performanceId, shouldFetchSeats);

  const seatsReady =
    shouldFetchSeats &&
    !!seatCounts &&
    !seatCountsLoading &&
    !seatCountsError;
  const remaining = seatsReady ? seatCounts.availableCount : null;

  const canEnter =
    !!concert &&
    canBookConcert({
      status: concert.status,
      seatsReady,
      remaining,
    });

  // 가드 판정 전(상세·seat-counts 로딩)에는 좌석맵/SSE를 열지 않음
  const guardPending =
    !!performanceId &&
    !isNaN(performanceId) &&
    (concertLoading ||
      (!concertError &&
        !!concert &&
        shouldFetchSeats &&
        seatCountsLoading));

  const { data: seats, isLoading, isError } = useSeats(
    performanceId,
    canEnter,
  );
  const holdSeatMutation = useHoldSeat(performanceId ?? 0);
  useSeatEventStream(performanceId, canEnter);

  // 직접 URL 진입 시에도 결제 플로우용 store를 맞춤
  useEffect(() => {
    if (!canEnter || !concert || !seatsReady || remaining === null) return;

    const venueDisplay = concert.venue ?? concert.address ?? "";
    setConcert({
      id: concert.id,
      title: concert.title,
      price: concert.price,
      showDate: concert.showDate,
      showTime: concert.showTime,
      venue: venueDisplay,
      performer: concert.performer,
      genre: concert.genre,
      imageMainUrl: concert.imageMainUrl,
      address: concert.address,
      durationMinutes: concert.durationMinutes,
      totalSeats: seatCounts!.totalCount,
      remainingSeats: remaining,
      status: concert.status,
    });
  }, [
    canEnter,
    concert,
    seatsReady,
    remaining,
    seatCounts,
    setConcert,
  ]);

  const stats = useMemo(() => {
    if (!seats) return { total: 0, available: 0, holding: 0, sold: 0 };
    return {
      total: seats.length,
      available: seats.filter((s) => s.status === "AVAILABLE").length,
      holding: seats.filter((s) => s.status === "HOLD").length,
      sold: seats.filter((s) => s.status === "SOLD").length,
    };
  }, [seats]);

  const totalAmount = currentConcert?.price ?? concert?.price ?? 0;

  if (!performanceId || isNaN(performanceId)) {
    return <Navigate to="/concerts" replace />;
  }

  if (guardPending) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          예매 가능 여부를 확인하는 중...
        </div>
      </div>
    );
  }

  // 상세 실패·좌석 정보 실패·예매 불가 → 상세로 복귀 (#181)
  if (concertError || !concert || seatCountsError || !canEnter) {
    return <Navigate to={`/concerts/${performanceId}`} replace />;
  }

  function handleSeatClick(seat: SeatWithStatus) {
    toggleSeat({
      id: seat.id,
      seatLayoutId: seat.seatLayoutId,
      seatNumber: seat.seatNumber,
      row: seat.row,
      col: seat.col,
    });
  }

  async function handleConfirm() {
    if (!selectedSeat || !performanceId) return;
    try {
      await holdSeatMutation.mutateAsync(selectedSeat.id);
      startTimer();
      navigate(`/concerts/${performanceId}/payment/confirm`);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("좌석 선점에 실패했습니다.");
      toast.error(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-white border border-border rounded-xl px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100"
        >
          <X size={14} />
          뒤로가기
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-text">좌석 선택</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            선택: {selectedSeat ? "1석" : "0석"} | 총 금액: ₩
            {totalAmount.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          disabled={!selectedSeat || holdSeatMutation.isPending}
          onClick={handleConfirm}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
            selectedSeat && !holdSeatMutation.isPending
              ? "bg-primary text-white hover:opacity-90"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {holdSeatMutation.isPending ? "선점 중..." : "좌석 확인"}
        </button>
      </div>

      {/* 예약 시간 안내 (상단 1개만) */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
        <Clock size={20} className="shrink-0 mt-0.5 text-yellow-600" />
        <div>
          <p className="text-sm font-semibold mb-1 text-yellow-900">
            예약 시간 안내
          </p>
          <p className="text-xs leading-relaxed text-yellow-800">
            좌석 선택 후 좌석 확인 버튼을 누르는 시점부터 5분의 제한 시간이
            시작됩니다. 결제 페이지에서도 동일한 타이머가 유지되며, 시간 내에
            결제를 완료해야 합니다.
          </p>
        </div>
      </div>

      {/* 범례 */}
      <div className="bg-white border border-border rounded-xl p-4 flex justify-center">
        <SeatLegend />
      </div>

      {/* 좌석맵 (STAGE 통합) */}
      <div className="bg-white border border-border rounded-xl p-6">
        {/* STAGE */}
        <div className="flex justify-center mb-6">
          <div className="px-12 py-2 rounded-lg border-2 border-primary text-primary font-semibold text-sm">
            🎤 STAGE
          </div>
        </div>

        {/* 좌석 그리드 */}
        {isLoading ? (
          <div className="text-center text-text-secondary py-12">
            좌석 정보 불러오는 중...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 text-error py-12">
            <AlertCircle size={20} />
            좌석 정보를 불러올 수 없습니다.
          </div>
        ) : (
          <div className="flex justify-center">
            <SeatMap
              seats={seats ?? []}
              selectedSeatId={selectedSeat?.id ?? null}
              onSeatClick={handleSeatClick}
            />
          </div>
        )}

        {/* 좌석 그리드 정보 */}
        {seats && seats.length > 0 && (
          <p className="text-center text-[10px] text-text-secondary mt-4">
            [Seat Grid: 10 rows × 12 columns]
          </p>
        )}
      </div>

      {/* 4개 통계 */}
      <div className="bg-white border border-border rounded-xl p-6 grid grid-cols-4 gap-4 text-center">
        <Stat label="전체 좌석" value={stats.total} colorClass="text-text" />
        <Stat
          label="예매 가능"
          value={stats.available}
          colorClass="text-primary"
        />
        <Stat label="진행중" value={stats.holding} colorClass="text-red-500" />
        <Stat label="판매 완료" value={stats.sold} colorClass="text-gray-400" />
      </div>

      {/* 예약 프로세스 */}
      <div className="bg-white border border-border rounded-xl p-6">
        <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
          📋 예약 프로세스
        </h3>
        <div className="space-y-2">
          <Step
            n={1}
            text="좌석 선택: 원하는 좌석을 클릭하여 선택 (시간 제한 없음)"
          />
          <Step n={2} text="확인 클릭: 좌석 확인 시점부터 5분 타이머 시작" />
          <Step n={3} text="결제 진행: 5분 안에 결제 완료해야 예약 확정" />
          <Step variant="success" text="예약 완료: 결제 완료 시 티켓 발급" />
          <Step
            variant="error"
            text="자동 해제: 시간 초과 시 좌석 자동 해제 및 목록으로 이동"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function Step({
  n,
  text,
  variant = "step",
}: {
  n?: number;
  text: string;
  variant?: "step" | "success" | "error";
}) {
  const styles = {
    step: "bg-gray-50 text-text-secondary",
    success: "bg-green-50 text-green-700",
    error: "bg-red-50 text-red-700",
  };
  const Icon =
    variant === "success"
      ? CheckCircle2
      : variant === "error"
        ? AlertCircle
        : null;

  return (
    <div className={`flex gap-2 text-xs rounded px-3 py-2 ${styles[variant]}`}>
      {n !== undefined ? (
        <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0 text-[11px]">
          {n}
        </span>
      ) : Icon ? (
        <Icon size={14} className="shrink-0 mt-px" />
      ) : null}
      <span>{text}</span>
    </div>
  );
}
