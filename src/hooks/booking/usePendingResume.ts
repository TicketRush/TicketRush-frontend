import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCancelPendingReservation } from "@/hooks/booking/useCancelPendingReservation";
import { useRestorePendingTimer } from "@/hooks/booking/useRestorePendingTimer";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useConcertStore } from "@/stores/reservation/concertStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import useSeatStore from "@/stores/reservation/seatStore";
import {
  useTimerDisplay,
  useTimerExpiry,
  useTimerStore,
} from "@/stores/reservation/timerStore";
import { isPaymentInFlight } from "@/utils/booking/isPaymentInFlight";
import {
  isResumablePaymentStatus,
  pendingResumePath,
  shouldExpirePendingOffFlow,
  shouldShowPendingResumeBanner,
} from "@/utils/booking/pendingResume";

/**
 * 결제 전 이탈 후에도 HOLD·타이머가 남아 있으면 이어가기를 유지한다 (#369).
 * 확인/결제 화면은 자체 만료 처리를 하고, 플로우 밖에서는 여기서 만료·복원을 맡는다.
 */
export function usePendingResume() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const paymentStatus = usePaymentStore((s) => s.status);
  const performanceId = useConcertStore((s) => s.currentConcert?.id) ?? 0;
  const concertTitle = useConcertStore((s) => s.currentConcert?.title) ?? "";
  const hasSelectedSeat = useSeatStore((s) => s.selectedSeat != null);
  const timerStatus = useTimerStore((s) => s.status);
  const { formatted } = useTimerDisplay();
  const cancelPendingReservation = useCancelPendingReservation();
  const { handleTimeout } = useReservationLifecycle();
  const releaseMutation = useReleaseSeat(performanceId);
  const [cancelPending, setCancelPending] = useState(false);

  const offFlow =
    shouldExpirePendingOffFlow(pathname) &&
    isResumablePaymentStatus(paymentStatus);
  const { status: restoreStatus } = useRestorePendingTimer(
    offFlow ? bookingNumber : null,
  );

  const expireRef = useRef({
    pathname,
    silent: false,
    handleTimeout,
    releaseMutation,
  });
  expireRef.current = {
    pathname,
    silent: restoreStatus === "missing",
    handleTimeout,
    releaseMutation,
  };

  const expireOffFlow = useCallback(() => {
    const current = expireRef.current;
    if (!shouldExpirePendingOffFlow(current.pathname)) return;
    const {
      bookingNumber: pendingNumber,
      seatId,
      status,
    } = usePaymentStore.getState();
    if (!pendingNumber) return;
    if (isPaymentInFlight(status)) return;
    void current.handleTimeout({
      silent: current.silent,
      onReleaseSeat: () =>
        current.releaseMutation.mutateAsync({
          bookingNumber: pendingNumber,
          seatId: seatId ?? undefined,
        }),
    });
  }, []);

  useTimerExpiry(expireOffFlow);

  useEffect(() => {
    if (restoreStatus === "missing") expireOffFlow();
  }, [restoreStatus, expireOffFlow]);

  const visible = shouldShowPendingResumeBanner({
    bookingNumber,
    paymentStatus,
    timerStatus,
    timerUnconfirmed: restoreStatus === "failed",
    performanceId,
    hasSelectedSeat,
    pathname,
  });

  const onResume = useCallback(() => {
    if (performanceId <= 0) return;
    navigate(pendingResumePath(performanceId, paymentStatus));
  }, [navigate, paymentStatus, performanceId]);

  const onCancel = useCallback(async () => {
    setCancelPending(true);
    try {
      await cancelPendingReservation();
    } finally {
      setCancelPending(false);
    }
  }, [cancelPendingReservation]);

  return {
    visible,
    title: concertTitle,
    remainingLabel: timerStatus === "running" ? formatted : null,
    cancelPending,
    onResume,
    onCancel,
  };
}
