// 결제 페이지
//
// 백엔드 스펙 반영:
//   - PaymentMethod = KAKAO | NAVER | TOSS (PG provider)
//   - paymentStore에 bookingId/bookingNumber/seatId 보관 (hold 후 전달)
//
// 변경 이력:
// - 이슈 #104: 결제 수단/만료 안내 카피·예매 정보 사이드바를 Figma에 맞춤.
// - 이슈 #124 후속 wiring 수정:
//   * 타이머 만료 모달 close 시 좌석/타이머 store를 정리하지 않던 문제 수정
//     (useReservationLifecycle.handleTimeout으로 seat+timer+payment 일괄 정리)
//   * 결제 실패 모달 close 시 paymentStore.reset()을 호출해 bookingNumber까지
//     날려버려 "재시도"가 사실상 불가능했던 문제 수정 (retryPayment()로 교체)
// - 이슈 #126: handlePayment를 mock setTimeout → 실 Toss SDK 호출로 교체.
//   결제 확정(POST /payment/confirm)은 Toss의 successUrl 리다이렉트를 받는
//   PaymentSuccessPage에서 처리한다 (Redirect 방식은 이 페이지로 되돌아오지 않음).

import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  useTimerDisplay,
  useTimerStore,
  useTimerExpiry,
} from "@/stores/reservation/timerStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import useSeatStore from "@/stores/reservation/seatStore";
import { useConcertStore } from "@/stores/reservation/concertStore";
import Button from "@/components/common/Button/Button";
import useAuthStore from "@/stores/global/authStore";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { LEGAL_LINKS } from "@/constants/legalLinks";
import { requestTossPayment } from "@/utils/payment/tossSdk";
import TimeoutModal from "@/components/payment/TimeoutModal";
import PaymentFailedModal from "@/components/payment/FailedModal";
import { paymentInFlightLeaveMessage } from "@/utils/booking/isPaymentInFlight";
import type { PaymentMethod } from "@/types/domain/payment";

const PAYMENT_PROVIDERS: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  initial: string;
  bgColor: string;
  textColor: string;
}> = [
  {
    value: "KAKAO",
    label: "카카오페이",
    description: "카카오톡으로 간편하게 결제",
    initial: "K",
    bgColor: "bg-kakao",
    textColor: "text-kakao-text",
  },
  {
    value: "NAVER",
    label: "네이버페이",
    description: "네이버로 안전하게 결제",
    initial: "N",
    bgColor: "bg-naver",
    textColor: "text-naver-text",
  },
  {
    value: "TOSS",
    label: "토스페이",
    description: "토스로 빠르게 결제",
    initial: "T",
    bgColor: "bg-[#0064FF]",
    textColor: "text-white",
  },
];

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const performanceId = id ? Number(id) : 0;

  const selectedSeat = useSeatStore((s) => s.selectedSeat);
  const currentConcert = useConcertStore((s) => s.currentConcert);
  const { formatted, mm } = useTimerDisplay();
  const timerStatus = useTimerStore((s) => s.status);

  const paymentStatus = usePaymentStore((s) => s.status);
  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const bookingId = usePaymentStore((s) => s.bookingId);
  const seatId = usePaymentStore((s) => s.seatId);
  const amount = usePaymentStore((s) => s.amount);
  const setMethod = usePaymentStore((s) => s.setMethod);
  const expire = usePaymentStore((s) => s.expire);
  const fail = usePaymentStore((s) => s.fail);
  const startRequest = usePaymentStore((s) => s.startRequest);
  const retryPayment = usePaymentStore((s) => s.retryPayment);
  const user = useAuthStore((s) => s.user);

  const releaseMutation = useReleaseSeat(performanceId);
  const { handleTimeout } = useReservationLifecycle();

  const [selectedProvider, setSelectedProvider] = useState<PaymentMethod | null>(
    null,
  );
  const [agreed, setAgreed] = useState(false);
  const [timeoutClosePending, setTimeoutClosePending] = useState(false);

  const cancelPendingBooking = useCallback(async () => {
    if (!bookingNumber) return;
    try {
      await releaseMutation.mutateAsync({
        bookingNumber,
        seatId: seatId ?? selectedSeat?.id,
      });
    } catch {
      // 만료/이탈 시 백엔드에서 이미 해제됐을 수 있음
    }
  }, [bookingNumber, releaseMutation, seatId, selectedSeat?.id]);

  useTimerExpiry(() => {
    expire();
  });

  useEffect(() => {
    if (!selectedSeat || !bookingNumber) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [selectedSeat, bookingNumber, id, navigate]);

  if (!selectedSeat || !bookingNumber) return null;

  const totalAmount = amount || (currentConcert?.price ?? 0);
  const isWarning = mm < 1;
  const paymentBusy =
    paymentStatus === "REQUESTING" || paymentStatus === "CONFIRMING";
  const canPay =
    !!selectedProvider && agreed && timerStatus === "running" && !paymentBusy;

  function handleSelectProvider(provider: PaymentMethod) {
    if (paymentBusy) return;
    setSelectedProvider(provider);
    setMethod(provider);
  }

  async function handlePayment() {
    if (
      !selectedProvider ||
      !agreed ||
      bookingId == null ||
      seatId == null ||
      !bookingNumber
    ) {
      return;
    }

    try {
      startRequest("");

      // Redirect 방식 — 정상 흐름에서는 브라우저가 결제창으로 이동하며
      // 이 Promise는 resolve되지 않는다. reject되면 결제창이 열리기 전
      // 단계의 오류(사용자 취소 등)이므로 catch에서 인페이지 모달로 안내.
      await requestTossPayment({
        provider: selectedProvider,
        customerKey: `user_${user?.userId ?? "guest"}`,
        orderId: bookingNumber,
        orderName: currentConcert
          ? `${currentConcert.title} 티켓 1매`
          : "공연 티켓 1매",
        amount: totalAmount,
        customerName: user?.name,
        customerEmail: user?.email,
        successUrl: `${window.location.origin}/concerts/${id}/payment/success`,
        failUrl: `${window.location.origin}/concerts/${id}/payment/failed`,
      });
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("결제 요청에 실패했습니다.");
      fail(err.message);
    }
  }

  async function handleCloseTimeoutModal() {
    if (timeoutClosePending) return;
    setTimeoutClosePending(true);
    try {
      await handleTimeout({
        onReleaseSeat: cancelPendingBooking,
        onNavigate: () => navigate(`/concerts/${id}/seats`),
        silent: true,
      });
    } finally {
      setTimeoutClosePending(false);
    }
  }

  function handleClosePaymentFailedModal() {
    // 예매(PENDING)는 그대로 유효 — bookingNumber 등을 유지한 채 결제만 재시도
    retryPayment();
  }

  function handleTermsLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    // Toss 요청/확정 중에는 외부 링크로 나가면 안 되므로 navigation을 막는다.
    if (paymentBusy) {
      event.preventDefault();
      event.stopPropagation();
      toast.info(paymentInFlightLeaveMessage(paymentStatus));
      return;
    }
    event.stopPropagation();
  }

  function handleBack() {
    // Confirm으로 복귀 — PENDING/HOLD는 유지 (이탈·만료 시에만 취소)
    navigate(`/concerts/${id}/payment/confirm`);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft size={14} />}
          disabled={releaseMutation.isPending || paymentBusy}
          onClick={handleBack}
        >
          뒤로가기
        </Button>
        <h1 className="text-4xl font-bold mt-4">결제 수단 선택</h1>
        <p className="text-text-secondary mt-1">
          안전한 결제를 위해 결제 정보를 입력해주세요
        </p>
      </div>

      <div className="rounded-xl px-[18px] py-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border-2 border-warning-border shadow-card">
        <div className="flex items-center gap-3 min-w-0">
          <AlertCircle
            size={24}
            className={`shrink-0 ${isWarning ? "text-timer-warning" : "text-[#E17100]"}`}
          />
          <div>
            <p className="font-bold text-base text-[#973C00]">
              좌석 예약 시간이 곧 만료됩니다
            </p>
            <p className="text-sm mt-0.5 text-[#BB4D00]">
              시간 내에 결제를 완료하지 않으면 선택한 좌석이 자동 해제됩니다
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm text-text-secondary">남은 시간</p>
          <p
            className={`text-[30px] font-bold tabular-nums leading-9 ${
              isWarning ? "text-timer-warning" : "text-[#E17100]"
            }`}
          >
            {formatted}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_334px] gap-6">
        <div className="bg-white rounded-xl p-6 shadow-card h-fit">
          <h2 className="font-bold text-lg mb-6">결제 수단</h2>
          <div className="space-y-2">
            {PAYMENT_PROVIDERS.map((p) => {
              const selected = selectedProvider === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  disabled={paymentBusy}
                  aria-pressed={selected}
                  onClick={() => handleSelectProvider(p.value)}
                  className={`w-full p-4 rounded-[10px] border-2 transition-all flex items-center gap-3 ${
                    selected
                      ? "border-primary bg-gray-50"
                      : "border-border bg-white"
                  } ${
                    paymentBusy
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${p.bgColor} ${p.textColor}`}
                  >
                    {p.initial}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold">{p.label}</p>
                    <p className="text-xs text-text-secondary">
                      {p.description}
                    </p>
                  </div>
                  {selected && (
                    <CheckCircle2
                      size={20}
                      className="text-seat-selected shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:sticky lg:top-16 h-fit">
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h3 className="font-bold text-lg">예매 정보</h3>

            <div className="mt-6">
              <p className="text-sm text-text-secondary mb-2">선택한 좌석</p>
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-primary text-white text-sm font-semibold">
                {selectedSeat.seatNumber}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <Row label="좌석 수" value="1석" />
              <Row label="단가" value={`₩${totalAmount.toLocaleString()}`} />
              <Row label="수수료" value="₩0" />
            </div>

            <div className="mt-3 pt-3 border-t border-border flex justify-between items-baseline">
              <span className="font-bold">총 결제 금액</span>
              <span className="text-2xl font-bold text-primary">
                ₩{totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="mt-6 flex items-start gap-3 bg-gray-50 border-2 border-border rounded-[10px] p-3">
              <input
                id="payment-terms"
                type="checkbox"
                checked={agreed}
                disabled={paymentBusy}
                onChange={(e) => setAgreed(e.target.checked)}
                className={`mt-1 accent-primary ${
                  paymentBusy ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              />
              <span className="text-sm text-text leading-5">
                <a
                  href={LEGAL_LINKS.terms}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                  onClick={handleTermsLinkClick}
                >
                  결제 약관 및 환불 정책
                </a>
                <label
                  htmlFor="payment-terms"
                  className={
                    paymentBusy ? "cursor-not-allowed" : "cursor-pointer"
                  }
                >
                  에 동의합니다
                </label>
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canPay}
                loading={paymentBusy}
                onClick={handlePayment}
              >
                {paymentStatus === "REQUESTING"
                  ? "결제 진행 중..."
                  : paymentStatus === "CONFIRMING"
                    ? "확인 중..."
                    : `₩${totalAmount.toLocaleString()} 결제하기`}
              </Button>
              <Button
                variant="outline"
                size="md"
                fullWidth
                icon={<ArrowLeft size={20} />}
                disabled={releaseMutation.isPending || paymentBusy}
                onClick={handleBack}
              >
                이전으로
              </Button>
            </div>
          </div>
        </div>
      </div>

      {paymentStatus === "EXPIRED" && (
        <TimeoutModal
          onClose={() => void handleCloseTimeoutModal()}
          closePending={timeoutClosePending}
        />
      )}
      {paymentStatus === "FAILED" && (
        <PaymentFailedModal onClose={handleClosePaymentFailedModal} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
