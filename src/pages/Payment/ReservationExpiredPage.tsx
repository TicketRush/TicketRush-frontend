// 직접 URL 진입 시 fallback 페이지
// PaymentPage 타이머 만료 시에도 이 화면으로 이동한다
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TimeoutModal from "@/components/payment/TimeoutModal";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { isPaymentInFlight } from "@/utils/booking/isPaymentInFlight";

export default function ReservationExpiredPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const performanceId = id ? Number(id) : 0;
  const releaseMutation = useReleaseSeat(performanceId);
  const { handleTimeout } = useReservationLifecycle();
  const [closePending, setClosePending] = useState(false);

  const handleTimeoutRef = useRef(handleTimeout);
  handleTimeoutRef.current = handleTimeout;
  const releaseMutationRef = useRef(releaseMutation);
  releaseMutationRef.current = releaseMutation;
  const didCancelRef = useRef(false);

  async function cancelRemainingPending() {
    const { bookingNumber, seatId, status } = usePaymentStore.getState();
    if (!bookingNumber || isPaymentInFlight(status)) return true;

    return handleTimeoutRef.current({
      onReleaseSeat: () =>
        releaseMutationRef.current.mutateAsync({
          bookingNumber,
          seatId: seatId ?? undefined,
        }),
      silent: true,
    });
  }

  // 남은 PENDING을 마운트 시 조용히 취소해 「이미 해제」 카피와 맞춘다.
  useEffect(() => {
    if (didCancelRef.current) return;
    const { bookingNumber, status } = usePaymentStore.getState();
    if (!bookingNumber || isPaymentInFlight(status)) return;
    didCancelRef.current = true;

    setClosePending(true);
    void cancelRemainingPending().finally(() => setClosePending(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CTA로 좌석에 돌아갈 때 stale PENDING이 있으면 한 번 더 취소 (#260)
  const handleClose = useCallback(async () => {
    if (closePending) return;

    const { bookingNumber, status } = usePaymentStore.getState();
    if (bookingNumber && !isPaymentInFlight(status)) {
      setClosePending(true);
      try {
        await cancelRemainingPending();
      } finally {
        setClosePending(false);
      }
    }

    navigate(`/concerts/${id}/seats`);
  }, [closePending, id, navigate]);

  return <TimeoutModal onClose={handleClose} closePending={closePending} />;
}
