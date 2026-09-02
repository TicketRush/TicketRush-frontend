// 예매 확인 페이지
//
// 백엔드 스펙 반영 변경:
//   - selectedSeat.seatNumber → seatNumber
//   - totalAmount 계산: selectedSeat 제거, currentConcert만 사용
//
// ⚠️ 이슈 #124 후속: 좌석 HOLD는 예매(PENDING) 생성으로 대체됨.
//   "좌석 다시 선택" 시 및 타이머 만료 시 useReservationLifecycle로 예매를
//   취소(cancelBookingApi)해 서버 좌석 HOLD도 함께 해제.
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, ArrowLeft, AlertCircle } from "lucide-react";
import Button from "@/components/common/Button/Button";
import { CircularTimer } from "@/components/common/CircularTimer/CircularTimer";
import PendingTimerRestoreNotice from "@/components/payment/PendingTimerRestoreNotice";
import {
  useTimerDisplay,
  useTimerExpiry,
  useTimerStore,
} from "@/stores/reservation/timerStore";
import useSeatStore from "@/stores/reservation/seatStore";
import { useConcertStore } from "@/stores/reservation/concertStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { useRestorePendingTimer } from "@/hooks/booking/useRestorePendingTimer";
import { isPaymentInFlight } from "@/utils/booking/isPaymentInFlight";

export default function ReservationConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const performanceId = id ? Number(id) : undefined;

  const selectedSeat = useSeatStore((s) => s.selectedSeat);
  const currentConcert = useConcertStore((s) => s.currentConcert);
  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const { remainingMs } = useTimerDisplay();

  const releaseSeatMutation = useReleaseSeat(performanceId ?? 0);
  const { handleTimeout, handleCancelReservation } = useReservationLifecycle();
  const timerStatus = useTimerStore((s) => s.status);
  const { status: restoreStatus, retry: retryRestore } =
    useRestorePendingTimer(bookingNumber);
  const skipSeatsRedirectRef = useRef(false);

  function releaseSeat() {
    if (!bookingNumber) return Promise.resolve();
    return releaseSeatMutation.mutateAsync({
      bookingNumber,
      seatId: selectedSeat?.id,
    });
  }

  function goExpired() {
    if (isPaymentInFlight(usePaymentStore.getState().status)) return;
    skipSeatsRedirectRef.current = true;
    void handleTimeout({
      onReleaseSeat: releaseSeat,
      onNavigate: () =>
        navigate(`/concerts/${id}/payment/expired`, { replace: true }),
    });
  }

  // 만료 시 예매 취소 + expired 페이지로
  useTimerExpiry(goExpired);

  // PENDING 목록에 없으면 서버에서 이미 만료된 것으로 본다
  useEffect(() => {
    if (restoreStatus === "missing") goExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreStatus]);

  // 좌석 없으면 좌석 페이지로 (만료 이동 중에는 가로채지 않음)
  useEffect(() => {
    if (skipSeatsRedirectRef.current) return;
    if (!selectedSeat) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [selectedSeat, id, navigate]);

  if (!selectedSeat) return null;

  function handleReselect() {
    handleCancelReservation({
      onReleaseSeat: releaseSeat,
      onNavigate: () => navigate(`/concerts/${id}/seats`),
    });
  }

  function handleBack() {
    handleCancelReservation({
      onReleaseSeat: releaseSeat,
      onNavigate: () => navigate(`/concerts/${id}/seats`),
    });
  }

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const canProceedToPayment =
    timerStatus === "running" && restoreStatus !== "failed";
  // 좌석 단위 가격 없음 → 공연 단가 사용 (백엔드 스펙)
  const totalAmount = currentConcert?.price ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Button
        variant="outline"
        size="sm"
        className="mb-6"
        icon={<ArrowLeft size={14} />}
        disabled={releaseSeatMutation.isPending}
        onClick={handleBack}
      >
        뒤로가기
      </Button>

      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
          <Clock size={12} /> 한정 좌석 예매중
        </span>
        <h1 className="text-3xl font-bold mb-1">예매 확인</h1>
        <p className="text-sm text-text-secondary">
          좌석을 확인하시고 결제를 진행해주세요
        </p>
      </div>

      {restoreStatus === "failed" && (
        <PendingTimerRestoreNotice
          onRetry={retryRestore}
          onBackToSeats={handleBack}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-8">
        <div className="flex justify-center">
          {restoreStatus === "loading" ? (
            <p className="text-sm text-text-secondary">
              만료 시각을 확인하는 중...
            </p>
          ) : (
            <CircularTimer remainingSeconds={remainingSeconds} />
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h3 className="font-bold mb-4">📋 예매된 좌석</h3>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1.5 rounded bg-primary text-white text-sm font-bold">
              {selectedSeat.seatNumber}
            </span>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <Row label="좌석 수" value="1석" />
            <Row
              label="총 결제 금액"
              value={`₩${totalAmount.toLocaleString()}`}
              emphasized
            />
          </div>

          <button
            type="button"
            onClick={() => navigate(`/concerts/${id}/payment`)}
            disabled={!canProceedToPayment}
            className="w-full mt-6 py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            결제하기
          </button>
          <button
            type="button"
            onClick={handleReselect}
            disabled={releaseSeatMutation.isPending}
            className="w-full mt-2 py-3 rounded-lg bg-white border border-border text-text-secondary hover:bg-gray-50 disabled:opacity-60"
          >
            좌석 다시 선택
          </button>
        </div>
      </div>

      <div className="bg-warning-bg border border-warning-border rounded-xl p-4 flex gap-3">
        <AlertCircle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-yellow-900 mb-1">
            예매 시간 안내
          </p>
          <p className="text-xs text-yellow-800 leading-relaxed">
            좌석 확인을 누른 시점부터 서버가 정한 만료 시각까지 결제가
            가능합니다. 결제 페이지에서도 같은 타이머가 이어지며, 새로고침해도
            만료 시각 기준으로 복원됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={
          emphasized
            ? "font-bold text-lg text-primary"
            : "text-sm font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}
