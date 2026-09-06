import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { toast } from "react-toastify";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import {
  isPaymentInFlight,
  paymentInFlightLeaveMessage,
} from "@/utils/booking/isPaymentInFlight";

/**
 * 결제 요청·확정 중 SPA 이탈을 막고, CONFIRMING일 때만 새로고침/탭 닫기 경고를 붙인다.
 * REQUESTING에는 beforeunload를 달지 않는다 — 토스 리다이렉트 자체가 경고를 띄운다.
 */
export function useBlockPaymentInFlightLeave() {
  const status = usePaymentStore((s) => s.status);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (currentLocation.pathname === nextLocation.pathname) return false;
    return isPaymentInFlight(usePaymentStore.getState().status);
  });

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    toast.info(
      paymentInFlightLeaveMessage(usePaymentStore.getState().status),
    );
    blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (status !== "CONFIRMING") return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);
}
