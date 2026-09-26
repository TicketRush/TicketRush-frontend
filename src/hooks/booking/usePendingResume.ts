import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { queryKeys } from "@/constants/queryKeys";
import { loadResumablePending } from "@/hooks/booking/loadResumablePending";
import { useCancelPendingReservation } from "@/hooks/booking/useCancelPendingReservation";
import useAuthStore from "@/stores/global/authStore";
import { safeParseSeatNumber } from "@/utils/seat/parseSeatNumber";
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
 * 같은 탭은 sessionStorage, 다른 탭은 서버 PENDING 조회로 같은 배너를 쓴다 (#369/#444).
 * 확인/결제 화면은 자체 만료 처리를 하고, 플로우 밖에서는 여기서 만료·복원을 맡는다.
 */
export function usePendingResume() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const paymentStatus = usePaymentStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const offFlow = shouldExpirePendingOffFlow(pathname);
  const serverResume = useQuery({
    queryKey: queryKeys.bookings.pendingResume(),
    queryFn: () => loadResumablePending(),
    enabled: !!accessToken && offFlow && !bookingNumber,
    retry: false,
    staleTime: 15_000,
  });
  const performanceId = useConcertStore((s) => s.currentConcert?.id) ?? 0;
  const concertTitle = useConcertStore((s) => s.currentConcert?.title) ?? "";
  const hasSelectedSeat = useSeatStore((s) => s.selectedSeat != null);
  const timerStatus = useTimerStore((s) => s.status);
  const { formatted } = useTimerDisplay();
  const cancelPendingReservation = useCancelPendingReservation();
  const { handleTimeout } = useReservationLifecycle();
  const releaseMutation = useReleaseSeat(performanceId);
  const [cancelPending, setCancelPending] = useState(false);

  const offFlowExpiry =
    offFlow && isResumablePaymentStatus(paymentStatus);
  const { status: restoreStatus } = useRestorePendingTimer(
    offFlowExpiry ? bookingNumber : null,
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

  const serverBooking = serverResume.data;

  useEffect(() => {
    if (!bookingNumber) return;
    queryClient.removeQueries({ queryKey: queryKeys.bookings.pendingResume() });
  }, [bookingNumber, queryClient]);

  useEffect(() => {
    if (!serverBooking) return;
    if (usePaymentStore.getState().bookingNumber) return;
    const parsed = safeParseSeatNumber(serverBooking.seatNumber);
    useSeatStore.getState().selectSeat({
      id: serverBooking.seatId,
      seatLayoutId: 0,
      seatNumber: serverBooking.seatNumber,
      row: parsed.row,
      col: parsed.col,
    });
    useConcertStore.getState().setConcert({
      id: serverBooking.performanceId,
      title: serverBooking.performanceTitle,
      price: serverBooking.price,
      showDate: serverBooking.performanceDate,
      showTime: serverBooking.performanceTime,
      venue: serverBooking.performanceVenue,
    });
    usePaymentStore.getState().startBooking(
      serverBooking.bookingNumber,
      serverBooking.bookingId,
      serverBooking.seatId,
      serverBooking.price,
    );
    useTimerStore.getState().startTimerFromExpiresAt(serverBooking.expiresAt);
  }, [serverBooking]);

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
      const cancelled = await cancelPendingReservation();
      if (cancelled) {
        queryClient.removeQueries({
          queryKey: queryKeys.bookings.pendingResume(),
        });
      }
    } finally {
      setCancelPending(false);
    }
  }, [cancelPendingReservation, queryClient]);

  return {
    visible,
    title: concertTitle,
    remainingLabel: timerStatus === "running" ? formatted : null,
    cancelPending,
    onResume,
    onCancel,
  };
}
