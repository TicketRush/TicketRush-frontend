// 좌석 선택 페이지
//
// 백엔드 스펙 반영 변경:
//   - handleSeatClick의 seat 객체 필드명 변경 (label→seatNumber, layoutId→seatLayoutId)
//   - seat 삭제 (백엔드 스펙엔 좌석 단위 가격 없음)
//   - totalAmount 계산: selectedSeat 제거, currentConcert만 사용
//
// 이슈 #122:
//   - 좌석맵: useSeats (seat-layouts)
//   - 잔여/상태별 통계: useSeatCounts (seat-counts) — layouts 배열을 직접 집계하지 않음
//
// ⚠️ 아키텍처 변경 (이슈 #124):
//   백엔드에 별도 좌석 HOLD API 없음. 예매 생성(POST /booking, PENDING 상태)이
//   좌석 HOLD를 겸함. useHoldSeat(seatId만 전달) → useCreateBooking(performanceId+seatId)로 교체.
//   생성 응답의 bookingNumber를 paymentStore.startBooking()에 전달해야
//   결제 페이지/예매 확인 페이지에서 결제·취소 시 사용 가능.
// - 2026-08-07 (#181):
//   - URL 직접 진입 시 상세 canBook과 동일 조건으로 가드
//   - 불가 시 /concerts/:id 로 replace redirect
//   - 허용 시 detail로 concertStore hydrate (직접 진입 대비)
// - 2026-08-15 (#181 리뷰):
//   - performanceId 변경 시 selectedSeat 초기화 (교차 공연 HOLD 방지)
//   - 가드용 detail/counts는 fresh 조회로 최신 기준 판정
// - #123: SSE/polling으로 선택 좌석이 AVAILABLE이 아니게 되면 선택 해제
// - #335: 진입 가드는 최초 판정만. SSE는 캐시 패치, 폴링/포커스 refetch는 맵을 유지
//   입장 후 잔여 0·판매 종료는 안내 후 확인 시 공연 상세로 이동
// - #340: 새로고침 시 window·좌석맵 가로 스크롤을 공연 ID 기준으로 복원
import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Button from "@/components/common/Button/Button";
import Modal from "@/components/common/Modal/Modal";
import SeatMap from "@/components/seat/SeatMap";
import SeatLegend from "@/components/seat/SeatLegend";
import { useConcertDetail } from "@/hooks/queries/useConcertDetail";
import { useSeats, useSeatCounts } from "@/hooks/queries/useSeats";
import { useSeatEventStream } from "@/hooks/seat/useSeatEventStream";
import { useSeatSelectionScroll } from "@/hooks/seat/useSeatSelectionScroll";
import { useCreateBooking } from "@/hooks/mutations/useCreateBooking";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useCancelPendingReservation } from "@/hooks/booking/useCancelPendingReservation";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import useSeatStore from "@/stores/reservation/seatStore";
import { useTimerStore } from "@/stores/reservation/timerStore";
import { useConcertStore } from "@/stores/reservation/concertStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { clearSelectedSeatIfTaken } from "@/utils/seat/clearSelectedSeatIfTaken";
import { fetchPendingBookingExpiresAt } from "@/api/bookings";
import {
  ApiError,
  isIgnorablePendingCancelError,
} from "@/api/errors/errorMapper";
import type { SeatWithStatus } from "@/types/domain/seat";
import {
  canBookConcert,
  shouldFetchSeatCounts,
} from "@/utils/concert/canBookConcert";
import { isInitialQueryPending } from "@/utils/query/isInitialQueryPending";
import {
  resolveSeatExitNotice,
  shouldNotifySeatTaken,
  seatMapHasAvailable,
  getSeatExitNoticeCopy,
  type SoldOutNoticeKind,
} from "@/utils/seat/soldOutNotice";

export default function SeatSelectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const performanceId = id ? Number(id) : undefined;

  const selectedSeat = useSeatStore((s) => s.selectedSeat);
  const toggleSeat = useSeatStore((s) => s.toggleSeat);
  const resetSeat = useSeatStore((s) => s.reset);
  const startTimer = useTimerStore((s) => s.startTimer);
  const resetTimer = useTimerStore((s) => s.reset);
  const setConcert = useConcertStore((s) => s.setConcert);
  const currentConcert = useConcertStore((s) => s.currentConcert);
  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const pendingSeatId = usePaymentStore((s) => s.seatId);
  const resetPayment = usePaymentStore((s) => s.reset);
  const cancelPendingReservation = useCancelPendingReservation();
  const [hasEntered, setHasEntered] = useState(false);
  const [soldOutNotice, setSoldOutNotice] = useState<SoldOutNoticeKind | null>(
    null,
  );

  /** 내 「좌석 확인」 진행 중·내 PENDING HOLD는 선택 해제 스킵 (#167) */
  const confirmingSeatIdRef = useRef<number | null>(null);
  const shouldPreserveSelection = useCallback(
    (seatId: number) =>
      confirmingSeatIdRef.current === seatId ||
      (!!bookingNumber && pendingSeatId === seatId),
    [bookingNumber, pendingSeatId],
  );

  // URL의 공연이 바뀌면 이전 공연 selectedSeat·매진 안내 잔존 방지
  useEffect(() => {
    setHasEntered(false);
    setSoldOutNotice(null);
    if (!performanceId || isNaN(performanceId)) return;
    resetSeat();
  }, [performanceId, resetSeat]);

  const {
    data: concert,
    isLoading: concertLoading,
    isFetching: concertFetching,
    isFetchedAfterMount: concertFetchedAfterMount,
    isError: concertError,
  } = useConcertDetail(performanceId, { fresh: true });

  const seatTitleSource = concert?.title ?? currentConcert?.title;
  useDocumentTitle(
    seatTitleSource ? `${seatTitleSource} · 좌석 선택` : "좌석 선택",
  );

  const shouldFetchSeats =
    !!concert && shouldFetchSeatCounts(concert.status);
  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isFetching: seatCountsFetching,
    isFetchedAfterMount: seatCountsFetchedAfterMount,
    isError: seatCountsError,
  } = useSeatCounts(performanceId, shouldFetchSeats, { fresh: true });

  const concertInitialPending = isInitialQueryPending(
    concertLoading,
    concertFetching,
    concertFetchedAfterMount,
  );
  const countsInitialPending = isInitialQueryPending(
    seatCountsLoading,
    seatCountsFetching,
    seatCountsFetchedAfterMount,
  );

  const seatsReady =
    shouldFetchSeats &&
    !!seatCounts &&
    !countsInitialPending &&
    !seatCountsError;
  const remaining = seatsReady ? seatCounts.availableCount : null;

  const canEnter =
    !!concert &&
    canBookConcert({
      status: concert.status,
      seatsReady,
      remaining,
    });

  useEffect(() => {
    if (canEnter) setHasEntered(true);
  }, [canEnter]);

  const stayOnSeatMap = canEnter || hasEntered;

  // 가드는 최초 예매 가능 판정에만 쓴다. SSE/폴링/포커스 refetch는 맵을 유지 (#335)
  const guardPending =
    !!performanceId &&
    !isNaN(performanceId) &&
    (concertInitialPending ||
      (!concertError &&
        !!concert &&
        shouldFetchSeats &&
        countsInitialPending));

  // #122: layouts → 좌석맵, counts → 하단 잔여/상태 통계
  const { data: seatMap, isLoading, isError } = useSeats(
    performanceId,
    stayOnSeatMap,
  );
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const { onMapScroll } = useSeatSelectionScroll({
    performanceId:
      performanceId != null && Number.isSafeInteger(performanceId)
        ? performanceId
        : null,
    ready:
      stayOnSeatMap &&
      !!seatMap?.layoutReady &&
      !guardPending &&
      !concertError &&
      !seatCountsError,
    containerRef: mapScrollRef,
  });
  const createBookingMutation = useCreateBooking();
  const releaseSeatMutation = useReleaseSeat(performanceId ?? 0);
  useSeatEventStream(performanceId, stayOnSeatMap, {
    shouldPreserveSelection,
    concertStatus: concert?.status,
  });

  const isOwnHoldInFlight =
    createBookingMutation.isPending ||
    releaseSeatMutation.isPending ||
    !!bookingNumber;

  useEffect(() => {
    setSoldOutNotice(
      resolveSeatExitNotice({
        hasEntered,
        concertStatus: concert?.status,
        remaining,
        isOwnHoldInFlight,
        mapHasAvailable: seatMapHasAvailable(seatMap),
        counts: seatCounts,
      }),
    );
  }, [
    hasEntered,
    concert?.status,
    remaining,
    seatCounts,
    isOwnHoldInFlight,
    seatMap,
  ]);

  // polling fallback 등으로 캐시가 갱신돼도 선택 좌석이 AVAILABLE이 아니면 해제
  useEffect(() => {
    if (!selectedSeat || !seatMap?.seats) return;
    const notify = shouldNotifySeatTaken({
      remaining,
      mapHasAvailable: seatMapHasAvailable(seatMap),
      concertStatus: concert?.status,
    });
    const current = seatMap.seats.find((s) => s.id === selectedSeat.id);
    if (!current) {
      clearSelectedSeatIfTaken(selectedSeat.id, "SOLD", {
        preserve: shouldPreserveSelection(selectedSeat.id),
        notify,
      });
      return;
    }
    clearSelectedSeatIfTaken(selectedSeat.id, current.status, {
      preserve: shouldPreserveSelection(selectedSeat.id),
      notify,
    });
  }, [seatMap, selectedSeat, shouldPreserveSelection, remaining, concert?.status]);

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

  // 브라우저 뒤로가기·F5로 좌석에 남은 PENDING은 이탈로 보고 즉시 취소 (#167).
  // 의존성 비움: 「좌석 확인」직후 bookingNumber가 생긴 뒤 이 effect가 다시 돌면
  // 방금 만든 PENDING을 취소하게 된다.
  useEffect(() => {
    if (!usePaymentStore.getState().bookingNumber) return;
    void cancelPendingReservation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = {
    total: seatCounts?.totalCount ?? 0,
    available: seatCounts?.availableCount ?? 0,
    holding: seatCounts?.holdCount ?? 0,
    sold: seatCounts?.soldCount ?? 0,
  };

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

  // 상세 실패·좌석 정보 실패·최초 예매 불가 → 상세로 복귀 (#181)
  // 입장 후 잔여 0·판매 종료는 안내 모달로 처리한다 (#335)
  if (concertError || !concert || seatCountsError) {
    return <Navigate to={`/concerts/${performanceId}`} replace />;
  }
  if (!hasEntered && !canEnter) {
    return <Navigate to={`/concerts/${performanceId}`} replace />;
  }

  const selectedSeatAvailable =
    !!selectedSeat &&
    !!seatMap?.seats?.some(
      (s) => s.id === selectedSeat.id && s.status === "AVAILABLE",
    );

  function handleSeatClick(seat: SeatWithStatus) {
    if (soldOutNotice) return;
    toggleSeat({
      id: seat.id,
      seatLayoutId: seat.seatLayoutId,
      seatNumber: seat.seatNumber,
      row: seat.row,
      col: seat.col,
    });
  }

  /**
   * 기존 PENDING이 있으면 취소 후 payment store 초기화.
   * - 이미 만료/취소/미존재 → 무시하고 store만 비움
   * - 그 외 실패(네트워크·5xx 등) → store 유지한 채 throw (새 PENDING 생성 중단)
   */
  async function cancelExistingPending() {
    const existing = usePaymentStore.getState().bookingNumber;
    if (!existing) return;

    try {
      await releaseSeatMutation.mutateAsync({
        bookingNumber: existing,
        seatId: selectedSeat?.id,
      });
      resetPayment();
    } catch (error: unknown) {
      if (isIgnorablePendingCancelError(error)) {
        resetPayment();
        return;
      }
      throw ApiError.fromUnknown(error);
    }
  }

  async function handleConfirm() {
    if (!selectedSeat || !performanceId || !selectedSeatAvailable) return;

    // 「좌석 확인」~Confirm 진입까지: 내 HOLD/SSE로 선택이 풀리지 않게 유지
    // (실제 선점 성공 여부는 createBooking API가 판단. 실패 시 아래에서 해제)
    const seatId = selectedSeat.id;
    confirmingSeatIdRef.current = seatId;

    try {
      // Confirm → 뒤로 → 재확인 시 중복 PENDING 방지: 기존 예매 먼저 취소
      await cancelExistingPending();

      // 예매(PENDING) 생성 = 좌석 HOLD. 응답의 bookingNumber를 결제 플로우 전체에서 사용.
      const booking = await createBookingMutation.mutateAsync({
        performanceId,
        seatId: selectedSeat.id,
      });
      usePaymentStore
        .getState()
        .startBooking(
          booking.bookingNumber,
          booking.bookingId,
          selectedSeat.id,
          totalAmount,
        );
      try {
        const expiresAt = await fetchPendingBookingExpiresAt(
          booking.bookingNumber,
        );
        if (expiresAt) {
          useTimerStore.getState().startTimerFromExpiresAt(expiresAt);
        } else {
          // 목록에 아직 없으면 잠깐 로컬 5분. 확인 화면에서 서버 시각으로 덮어쓴다.
          startTimer();
        }
      } catch {
        startTimer();
      }
      navigate(`/concerts/${performanceId}/payment/confirm`);
    } catch (error: unknown) {
      confirmingSeatIdRef.current = null;
      const err = ApiError.fromUnknown(error);

      // 기존 PENDING 취소 실패(네트워크·5xx)는 payment store를 유지해야 하므로 선택만 건드리지 않음
      if (usePaymentStore.getState().bookingNumber) {
        toast.error(err.message || "기존 예매 취소에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      // 남이 먼저 선점 등으로 API 실패 → 선택 해제 (preserve 해제 후)
      useSeatStore.getState().reset();
      toast.error(err.message || "좌석 선점에 실패했습니다.");
    }
  }

  function handleSoldOutConfirm() {
    resetSeat();
    navigate(`/concerts/${performanceId}`, { replace: true });
  }

  async function handleBack() {
    try {
      if (bookingNumber) {
        await cancelExistingPending();
        resetSeat();
        resetTimer();
      }
      navigate(`/concerts/${id}`);
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? error
          : new Error("기존 예매 취소에 실패했습니다. 다시 시도해 주세요.");
      toast.error(err.message);
    }
  }

  const isConfirmPending =
    createBookingMutation.isPending || releaseSeatMutation.isPending;
  const soldOutCopy = soldOutNotice
    ? getSeatExitNoticeCopy(soldOutNotice, concert.bookingOpenAt)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-white border border-border rounded-xl px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          icon={<X size={14} />}
          disabled={isConfirmPending}
          onClick={handleBack}
        >
          뒤로가기
        </Button>
        <div className="text-center">
          <h1 className="text-base font-bold text-text">좌석 선택</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {selectedSeatAvailable
              ? `선택: 1석 | 총 금액: ₩${totalAmount.toLocaleString()}`
              : "선택: 0석"}
          </p>
        </div>
        <button
          type="button"
          disabled={!selectedSeatAvailable || isConfirmPending || !!soldOutNotice}
          onClick={handleConfirm}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
            selectedSeatAvailable && !isConfirmPending && !soldOutNotice
              ? "bg-primary text-white hover:opacity-90"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isConfirmPending ? "선점 중..." : "좌석 확인"}
        </button>
      </div>

      {/* 예약 시간 안내 (상단 1개만) */}
      <div className="bg-warning-bg border border-warning-border rounded-xl p-4 flex gap-3">
        <Clock size={20} className="shrink-0 mt-0.5 text-yellow-600" />
        <div>
          <p className="text-sm font-semibold mb-1 text-yellow-900">
            예약 시간 안내
          </p>
          <p className="text-xs leading-relaxed text-yellow-800">
            좌석 확인을 누른 시점부터 서버가 정한 만료 시각까지 결제가
            가능합니다. 결제 페이지에서도 같은 타이머가 이어지며, 새로고침해도
            만료 시각 기준으로 복원됩니다.
          </p>
        </div>
      </div>

      {/* 좌석맵 (STAGE 통합) + 우측 범례 */}
      <div className="bg-white border border-border rounded-xl p-6">
        {/* STAGE */}
        <div className="flex justify-center mb-6">
          <div className="px-12 py-2 rounded-lg border-2 border-primary text-primary font-semibold text-sm">
            🎤 STAGE
          </div>
        </div>

        {/* 좌석 그리드 — 범례는 우측.
            flex w-max min-w-full justify-center:
            좁을 때 콘텐츠 폭만큼 늘어나 왼쪽부터 스크롤, 넓을 때 가운데 정렬.
            패딩은 툴팁·포커스 링이 overflow에 잘리지 않게 확보. */}
        <div
          ref={mapScrollRef}
          onScroll={onMapScroll}
          className="overflow-x-auto pt-8 pb-3 px-2"
        >
          <div className="flex w-max min-w-full justify-center">
            <div className="flex flex-row items-center gap-6">
              {isLoading && !seatMap ? (
                <div className="text-center text-text-secondary py-12">
                  좌석 정보 불러오는 중...
                </div>
              ) : isError && !seatMap ? (
                <div className="flex items-center justify-center gap-2 text-error py-12">
                  <AlertCircle size={20} />
                  좌석 정보를 불러올 수 없습니다.
                </div>
              ) : seatMap && !seatMap.layoutReady ? (
                <div className="text-center text-text-secondary py-12">
                  좌석 배치가 아직 생성되지 않았습니다.
                </div>
              ) : (
                <SeatMap
                  seats={seatMap?.seats ?? []}
                  layout={seatMap?.layout}
                  selectedSeatId={selectedSeatAvailable ? (selectedSeat?.id ?? null) : null}
                  onSeatClick={handleSeatClick}
                />
              )}
              <SeatLegend />
            </div>
          </div>
        </div>
      </div>

      {/* 4개 통계 */}
      <div className="bg-white border border-border rounded-xl p-6 grid grid-cols-4 gap-4 text-center">
        <Stat label="전체 좌석" value={stats.total} colorClass="text-text" />
        <Stat
          label="예매 가능"
          value={stats.available}
          colorClass="text-seat-available"
        />
        {/* holdCount = 공연 전체 HOLD. 내 임시예매만이 아님 (#260 후속 UX) */}
        <Stat
          label="임시예매"
          value={stats.holding}
          colorClass="text-seat-holding"
        />
        <Stat label="예매완료" value={stats.sold} colorClass="text-seat-sold" />
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
          <Step n={2} text="확인 클릭: 서버 만료 시각까지 타이머 시작" />
          <Step n={3} text="결제 진행: 만료 전에 결제 완료해야 예약 확정" />
          <Step variant="success" text="예약 완료: 결제 완료 시 티켓 발급" />
          <Step
            variant="error"
            text="자동 해제: 시간 초과 시 좌석 자동 해제 및 목록으로 이동"
          />
        </div>
      </div>

      <Modal
        isOpen={soldOutCopy != null}
        onClose={handleSoldOutConfirm}
        title={soldOutCopy?.title}
        size="sm"
        disableOverlayClose
        disableEscClose
        footer={
          <Button variant="primary" size="sm" onClick={handleSoldOutConfirm}>
            확인
          </Button>
        }
      >
        <p>{soldOutCopy?.message}</p>
      </Modal>
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
