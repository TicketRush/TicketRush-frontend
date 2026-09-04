// 결제 실패 페이지 — `/concerts/:id/payment/failed`
//
// 도달 경로:
//   1. Toss 결제창 자체 실패(카드 거절 등) → Toss가 failUrl로 리다이렉트
//      (code, message, orderId 쿼리 파라미터 포함)
//   2. 백엔드 POST /payment/confirm 실패 → PaymentSuccessPage에서 이동
//      (paymentStore.errorMessage에 이유가 담겨있음)
//   3. 직접 URL 진입 (fallback)
//
// ⚠️ PaymentPage 내부의 PaymentFailedModal은 "결제창이 열리기도 전에 실패"한
//   경우(SDK 자체 오류, 예: 사용자가 결제창을 닫음)에만 뜨는 별개 케이스이며,
//   그 경우엔 페이지 이동이 없어 여기까지 오지 않는다.
//
// #167: 「좌석으로 돌아가기」는 PENDING 즉시 취소 후 좌석 재조회. 「다시 시도」는
//   bookingNumber를 유지한다.
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PaymentFailedModal from "@/components/payment/FailedModal";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { useRestorePendingTimer } from "@/hooks/booking/useRestorePendingTimer";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { useTimerExpiry } from "@/stores/reservation/timerStore";
import { isPaymentInFlight } from "@/utils/booking/isPaymentInFlight";

export default function PaymentFailedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const performanceId = id ? Number(id) : 0;
  const [closePending, setClosePending] = useState(false);

  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const seatId = usePaymentStore((s) => s.seatId);
  const storeErrorMessage = usePaymentStore((s) => s.errorMessage);
  const retryPayment = usePaymentStore((s) => s.retryPayment);
  const fail = usePaymentStore((s) => s.fail);

  const releaseMutation = useReleaseSeat(performanceId);
  const { handleCancelReservation, handleTimeout } = useReservationLifecycle();
  const { status: restoreStatus } = useRestorePendingTimer(bookingNumber);

  async function releasePending() {
    if (!bookingNumber) return;
    await releaseMutation.mutateAsync({
      bookingNumber,
      seatId: seatId ?? undefined,
    });
  }

  function goExpired() {
    if (isPaymentInFlight(usePaymentStore.getState().status)) return;
    void handleTimeout({
      onReleaseSeat: releasePending,
      onNavigate: () =>
        navigate(`/concerts/${id}/payment/expired`, { replace: true }),
      silent: true,
    });
  }

  useTimerExpiry(goExpired);

  useEffect(() => {
    const { status, errorMessage } = usePaymentStore.getState();
    if (status === "REQUESTING") {
      fail(
        errorMessage ||
          searchParams.get("message") ||
          "결제가 완료되지 않았습니다.",
      );
    }
  }, [fail, searchParams]);

  useEffect(() => {
    if (restoreStatus === "missing") goExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreStatus]);

  // Toss가 결제창 자체 실패 시 붙여주는 쿼리 파라미터
  const tossMessage = searchParams.get("message");
  const reason = tossMessage || storeErrorMessage || "결제가 완료되지 않았습니다.";

  const expiredOnServer = restoreStatus === "missing";
  const canRetry =
    !!bookingNumber &&
    restoreStatus !== "missing" &&
    restoreStatus !== "loading";

  function handleRetry() {
    retryPayment();
    navigate(`/concerts/${id}/payment`);
  }

  async function handleBackToSeats() {
    if (closePending) return;
    if (!bookingNumber) {
      navigate(`/concerts/${id}/seats`);
      return;
    }
    setClosePending(true);
    try {
      await handleCancelReservation({
        onReleaseSeat: releasePending,
        onNavigate: () => navigate(`/concerts/${id}/seats`),
      });
    } finally {
      setClosePending(false);
    }
  }

  return (
    <PaymentFailedModal
      message={
        expiredOnServer
          ? "예매 제한 시간이 지나 다시 시도할 수 없습니다."
          : reason
      }
      onRetry={canRetry ? handleRetry : undefined}
      onClose={() => void handleBackToSeats()}
      closePending={closePending}
    />
  );
}
