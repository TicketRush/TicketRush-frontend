// 결제 페이지
//
// 백엔드 스펙 반영:
//   - PaymentMethod = KAKAO | NAVER | TOSS (PG provider)
//   - paymentStore에 bookingId/bookingNumber/seatId 보관 (hold 후 전달)
//
// 변경 이력:
// - 이슈 #124 후속 wiring 수정:
//   * 타이머 만료 모달 close 시 좌석/타이머 store를 정리하지 않던 문제 수정
//     (useReservationLifecycle.handleTimeout으로 seat+timer+payment 일괄 정리)
//   * 결제 실패 모달 close 시 paymentStore.reset()을 호출해 bookingNumber까지
//     날려버려 "재시도"가 사실상 불가능했던 문제 수정 (retryPayment()로 교체)
// - 이슈 #126: handlePayment를 mock setTimeout → 실 Toss SDK 호출로 교체.
//   결제 확정(POST /payment/confirm)은 Toss의 successUrl 리다이렉트를 받는
//   PaymentSuccessPage에서 처리한다 (Redirect 방식은 이 페이지로 되돌아오지 않음).

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  useTimerDisplay,
  useTimerStore,
  useTimerExpiry,
} from "@/stores/reservation/timerStore";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import useSeatStore from "@/stores/reservation/seatStore";
import { useConcertStore } from "@/stores/reservation/concertStore";
import useAuthStore from "@/stores/global/authStore";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import { requestTossPayment } from "@/utils/payment/tossSdk";
import TimeoutModal from "@/components/payment/TimeoutModal";
import PaymentFailedModal from "@/components/payment/FailedModal";
import type { PaymentMethod } from "@/types/domain/payment";

const PAYMENT_PROVIDERS: Array<{
  value: PaymentMethod;
  label: string;
  initial: string;
  bgColor: string;
  textColor: string;
}> = [
  {
    value: "KAKAO",
    label: "카카오페이",
    initial: "K",
    bgColor: "bg-[#FEE500]",
    textColor: "text-yellow-900",
  },
  {
    value: "NAVER",
    label: "네이버페이",
    initial: "N",
    bgColor: "bg-[#03C75A]",
    textColor: "text-white",
  },
  {
    value: "TOSS",
    label: "토스페이",
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

  function handleSelectProvider(provider: PaymentMethod) {
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
    // 서버 PENDING 예매 취소 + 좌석/타이머/결제 store 일괄 초기화
    await handleTimeout({
      onReleaseSeat: cancelPendingBooking,
      onNavigate: () => navigate(`/concerts/${id}/seats`),
    });
  }

  async function handleClosePaymentFailedModal() {
    // 예매(PENDING)는 그대로 유효 — bookingNumber 등을 유지한 채 결제만 재시도
    retryPayment();
  }

  function handleBack() {
    // Confirm으로 복귀 — PENDING/HOLD는 유지 (이탈·만료 시에만 취소)
    navigate(`/concerts/${id}/payment/confirm`);
  }

  const totalAmount = amount || (currentConcert?.price ?? 0);
  const isWarning = mm < 1;
  const canPay =
    !!selectedProvider &&
    agreed &&
    timerStatus === "running" &&
    paymentStatus !== "REQUESTING" &&
    paymentStatus !== "CONFIRMING";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={releaseMutation.isPending}
          className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <ArrowLeft size={14} />
          뒤로가기
        </button>
        <h1 className="text-2xl font-bold">결제 수단 선택</h1>
      </div>

      <div
        className={`rounded-xl p-4 mb-6 flex items-center justify-between ${
          isWarning
            ? "bg-red-50 border border-red-200"
            : "bg-yellow-50 border border-yellow-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            size={20}
            className={isWarning ? "text-red-600" : "text-yellow-600"}
          />
          <div>
            <p className="font-semibold text-sm">
              {isWarning
                ? "결제 시간이 곧 만료됩니다"
                : "좌석 임시 예매중입니다"}
            </p>
            <p className="text-xs mt-0.5 text-text-secondary">
              시간 내에 결제하지 않으면 좌석 예약이 취소됩니다
            </p>
          </div>
        </div>
        <div
          className={`text-3xl font-bold tabular-nums ${
            isWarning ? "text-red-600" : "text-yellow-900"
          }`}
        >
          {formatted}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <h2 className="font-bold text-lg">결제 수단</h2>
          <div className="bg-white border border-border rounded-xl p-6">
            <p className="text-sm font-semibold mb-4">간편결제 서비스 선택</p>
            <div className="space-y-2">
              {PAYMENT_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSelectProvider(p.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    selectedProvider === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${p.bgColor} ${p.textColor}`}
                  >
                    {p.initial}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-xs text-text-secondary">
                      간편하고 빠른 결제
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 h-fit">
          <div className="bg-white border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-bold">예매 정보</h3>

            <div className="space-y-2 text-sm">
              <Row label="예매번호" value={bookingNumber} />
              <Row label="좌석 수" value="1석" />
              <Row label="좌석" value={selectedSeat.seatNumber} />
              <Row label="단가" value={`₩${totalAmount.toLocaleString()}`} />
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold">총 결제 금액</span>
                <span className="text-2xl font-bold text-primary">
                  ₩{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-text-secondary leading-relaxed">
                <span className="font-semibold text-text">
                  결제 약관 및 환불 정책
                </span>
                에 동의합니다.
              </span>
            </label>

            <button
              type="button"
              onClick={handlePayment}
              disabled={!canPay}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                canPay
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {paymentStatus === "REQUESTING"
                ? "결제 진행 중..."
                : paymentStatus === "CONFIRMING"
                  ? "확인 중..."
                  : `₩${totalAmount.toLocaleString()} 결제하기`}
            </button>

            <button
              type="button"
              onClick={handleBack}
              disabled={releaseMutation.isPending}
              className="w-full py-2.5 rounded-lg bg-gray-100 text-text-secondary text-sm hover:bg-gray-200 disabled:opacity-60"
            >
              ← 이전으로
            </button>
          </div>
        </div>
      </div>

      {paymentStatus === "EXPIRED" && (
        <TimeoutModal onClose={handleCloseTimeoutModal} />
      )}
      {paymentStatus === "FAILED" && (
        <PaymentFailedModal onClose={handleClosePaymentFailedModal} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
