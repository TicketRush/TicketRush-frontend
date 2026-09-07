import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCancelPendingReservation } from "@/hooks/booking/useCancelPendingReservation";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { isPaymentInFlight } from "@/utils/booking/isPaymentInFlight";
import { shouldKeepPendingOnPath } from "@/utils/booking/isPendingBookingFlowPath";

/**
 * 확인/결제 플로우 밖(홈·상세·마이페이지 등)으로 나가면 PENDING을 취소한다 (#167).
 * 주소창 이동처럼 헤더 클릭을 거치지 않는 SPA 이탈도 포함한다.
 * 결제 요청·확정 중에는 취소하지 않는다.
 */
export function useCancelPendingIfLeftFlow() {
  const { pathname } = useLocation();
  const cancelPendingReservation = useCancelPendingReservation();
  const cancelRef = useRef(cancelPendingReservation);
  cancelRef.current = cancelPendingReservation;

  useEffect(() => {
    const { bookingNumber, status } = usePaymentStore.getState();
    if (!bookingNumber) return;
    if (isPaymentInFlight(status)) return;
    if (shouldKeepPendingOnPath(pathname)) return;
    void cancelRef.current();
  }, [pathname]);
}
