import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useAuthStore from "../../stores/global/authStore";
import { useCancelPendingReservation } from "@/hooks/booking/useCancelPendingReservation";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import {
  isPaymentInFlight,
  paymentInFlightLeaveMessage,
} from "@/utils/booking/isPaymentInFlight";
import Button from "../common/Button/Button";
import logo from "@/assets/images/logo.svg";

export default function Header() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const isLoggedIn = !!accessToken;
  const cancelPendingReservation = useCancelPendingReservation();
  const paymentStatus = usePaymentStore((s) => s.status);
  const leaveLocked = isPaymentInFlight(paymentStatus);

  function warnLeaveLocked(event: { preventDefault: () => void }) {
    event.preventDefault();
    toast.info(paymentInFlightLeaveMessage(paymentStatus));
  }

  const handleLogout = async () => {
    if (leaveLocked) {
      toast.info(paymentInFlightLeaveMessage(paymentStatus));
      return;
    }
    if (usePaymentStore.getState().bookingNumber) {
      const cancelled = await cancelPendingReservation();
      if (!cancelled || usePaymentStore.getState().bookingNumber) return;
    }
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          aria-disabled={leaveLocked || undefined}
          className={leaveLocked ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={(event) => {
            if (leaveLocked) {
              warnLeaveLocked(event);
              return;
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <img src={logo} alt="TicketRush" className="h-8 w-auto" />
        </Link>

        <nav className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                to="/reservations/mypage"
                aria-disabled={leaveLocked || undefined}
                onClick={(event) => {
                  if (leaveLocked) warnLeaveLocked(event);
                }}
              >
                <Button variant="secondary" size="sm">
                  내 예매
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleLogout()}
              >
                로그아웃
              </Button>
            </>
          ) : (
            <Link
              to="/login"
              aria-disabled={leaveLocked || undefined}
              onClick={(event) => {
                if (leaveLocked) warnLeaveLocked(event);
              }}
            >
              <Button variant="primary" size="sm">
                로그인
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
