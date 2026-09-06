import { useCallback } from "react";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { useConcertStore } from "@/stores/reservation/concertStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { isPaymentInFlight } from "@/utils/booking/isPaymentInFlight";

/**
 * 헤더·좌석 복귀 등에서 PENDING 예매를 취소하고 예매 스토어를 비운다 (#167).
 * 토스 이동·백엔드 확정 중에는 DELETE를 보내지 않는다.
 */
export function useCancelPendingReservation() {
  const performanceId = useConcertStore((s) => s.currentConcert?.id) ?? 0;
  const releaseMutation = useReleaseSeat(performanceId);
  const { handleCancelReservation } = useReservationLifecycle();

  return useCallback(async () => {
    const { bookingNumber, seatId, status } = usePaymentStore.getState();
    if (!bookingNumber) return true;
    if (isPaymentInFlight(status)) return false;

    return handleCancelReservation({
      onReleaseSeat: () =>
        releaseMutation.mutateAsync({
          bookingNumber,
          seatId: seatId ?? undefined,
        }),
    });
  }, [handleCancelReservation, releaseMutation]);
}
