// 직접 URL 진입 시 fallback 페이지
// PaymentPage 타이머 만료 시에도 이 화면으로 이동한다
import { useCallback, useState } from "react";
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

  const handleClose = useCallback(() => {
    if (closePending) return;

    const { bookingNumber, seatId, status } = usePaymentStore.getState();
    const goSeats = () => navigate(`/concerts/${id}/seats`);

    // 정상 만료는 이동 전에 PENDING을 이미 취소한다.
    // 직접 URL 진입 시에만 남은 PENDING을 여기서 해제한다.
    if (!bookingNumber || isPaymentInFlight(status)) {
      goSeats();
      return;
    }

    setClosePending(true);
    void handleTimeout({
      onReleaseSeat: () =>
        releaseMutation.mutateAsync({
          bookingNumber,
          seatId: seatId ?? undefined,
        }),
      onNavigate: goSeats,
    }).finally(() => setClosePending(false));
  }, [closePending, handleTimeout, id, navigate, releaseMutation]);

  return <TimeoutModal onClose={handleClose} closePending={closePending} />;
}
