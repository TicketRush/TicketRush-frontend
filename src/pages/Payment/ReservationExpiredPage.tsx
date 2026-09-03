// 직접 URL 진입 시 fallback 페이지
// PaymentPage 타이머 만료 시에는 인페이지 TimeoutModal이 정상 케이스다.
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

  // 남은 PENDING을 마운트 시 조용히 취소해 「이미 해제」 카피와 맞춘다.
  useEffect(() => {
    const { bookingNumber, seatId, status } = usePaymentStore.getState();
    if (!bookingNumber) return;
    if (isPaymentInFlight(status)) return;

    setClosePending(true);
    void handleTimeoutRef
      .current({
        onReleaseSeat: () =>
          releaseMutationRef.current.mutateAsync({
            bookingNumber,
            seatId: seatId ?? undefined,
          }),
        silent: true,
      })
      .finally(() => setClosePending(false));
  }, []);

  const handleClose = useCallback(() => {
    if (closePending) return;
    navigate(`/concerts/${id}/seats`);
  }, [closePending, id, navigate]);

  return <TimeoutModal onClose={handleClose} closePending={closePending} />;
}
