// 결제 페이지
//
// 백엔드 스펙 반영 변경:
//   - PAYMENT_METHODS → PAYMENT_PROVIDERS 리네임 (개념 정리)
//     * PaymentMethod = "CARD" | "SIMPLE_PAY" (결제 방식)
//     * PaymentProvider = "KAKAO" | "NAVER" | "TOSS" (결제 제공자)
//     * 기존 코드는 두 개념 혼동. 카카오/네이버/토스는 provider.
//   - KAKAO → KAKAO, NAVER → NAVER, TOSS → TOSS
//   - selectedSeat.seatNumber → seatNumber
//   - selectedSeat 제거 → currentConcert 사용
//   - paymentStore.setMethod에는 "SIMPLE_PAY" 저장 (3개 다 간편결제 카테고리)
//     * 실 SDK 연동 시 paymentStore에 provider 필드 추가 예정
//
// 이슈 #124/#125:
//   - 타이머 만료/이탈 시 cancelBooking으로 PENDING 해제
//   - 결제 완료 이동은 store bookingNumber 사용 (하드코딩 제거)

import { useState, useEffect } from "react";
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
import TimeoutModal from "@/components/payment/TimeoutModal";
import PaymentFailedModal from "@/components/payment/FailedModal";
import { useReleaseSeat } from "@/hooks/mutations/useReleaseSeat";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";
import type { PaymentProvider } from "@/types/domain/payment";

// 결제 제공자 3종 (카카오페이/네이버페이/토스페이는 모두 간편결제)
const PAYMENT_PROVIDERS: Array<{
  value: PaymentProvider;
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
  const setMethod = usePaymentStore((s) => s.setMethod);
  const expire = usePaymentStore((s) => s.expire);
  const fail = usePaymentStore((s) => s.fail);
  const succeed = usePaymentStore((s) => s.succeed);
  const startRequest = usePaymentStore((s) => s.startRequest);
  const startConfirming = usePaymentStore((s) => s.startConfirming);
  const reset = usePaymentStore((s) => s.reset);

  const releaseSeatMutation = useReleaseSeat(performanceId);
  const { handleCancelReservation } = useReservationLifecycle();

  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProvider | null>(null);
  const [agreed, setAgreed] = useState(false);

  function releaseSeat() {
    const bn = usePaymentStore.getState().bookingNumber;
    if (!bn) return Promise.resolve();
    return releaseSeatMutation.mutateAsync({
      bookingNumber: bn,
      seatId: selectedSeat?.id,
    });
  }

  // 타이머 만료 → 서버 PENDING 취소 후 모달
  useTimerExpiry(() => {
    void (async () => {
      try {
        await releaseSeat();
      } catch {
        /* 이미 만료됐을 수 있음 */
      }
      expire();
    })();
  });

  useEffect(() => {
    if (!selectedSeat) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [selectedSeat, id, navigate]);

  if (!selectedSeat) return null;

  function handleSelectProvider(provider: PaymentProvider) {
    setSelectedProvider(provider);
    // 3종 다 간편결제 카테고리 → SIMPLE_PAY
    // 실 SDK 연동 시 paymentStore에 provider 필드 추가하여 별도 저장 예정
    setMethod("SIMPLE_PAY");
  }

  async function handlePayment() {
    if (!selectedProvider || !agreed) return;
    const bn = usePaymentStore.getState().bookingNumber;
    if (!bn) {
      fail("예매 정보가 없습니다. 좌석을 다시 선택해 주세요.");
      return;
    }

    try {
      startRequest("mock-payment-key");
      // TODO: 이슈 #B-10 — 실제 Toss SDK 호출로 교체
      await new Promise((r) => setTimeout(r, 800));

      // mock: 10% 확률로 실패
      // if (Math.random() < 0.1) {
      //   throw new Error(
      //     "결제가 거절되었습니다. 다른 결제 수단을 사용해주세요.",
      //   );
      // }

      startConfirming();
      await new Promise((r) => setTimeout(r, 500));
      succeed();

      navigate(`/reservations/${bn}`);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("결제에 실패했습니다.");
      fail(err.message);
    }
  }

  function handleCloseTimeoutModal() {
    // 만료 시점에 이미 서버 취소 완료 → 클라 정리만
    reset();
    navigate(`/concerts/${id}/seats`);
  }

  function handleClosePaymentFailedModal() {
    // 결제 실패 후 좌석 페이지로 이탈 → PENDING 해제
    handleCancelReservation({
      onReleaseSeat: releaseSeat,
      onNavigate: () => navigate(`/concerts/${id}/seats`),
      message: "결제를 취소하고 좌석을 해제했습니다.",
    });
  }

  function handleBack() {
    // Confirm으로 복귀 — PENDING/HOLD는 유지 (이탈·만료 시에만 취소)
    navigate(`/concerts/${id}/payment/confirm`);
  }

  // 좌석 단위 가격 없음 → 공연 단가 사용 (백엔드 스펙)
  const totalAmount = currentConcert?.price ?? 0;

  const isWarning = mm < 1; // 1분 미만
  const canPay =
    !!selectedProvider &&
    agreed &&
    !!bookingNumber &&
    timerStatus === "running" &&
    paymentStatus !== "REQUESTING" &&
    paymentStatus !== "CONFIRMING";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={releaseSeatMutation.isPending}
          className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <ArrowLeft size={14} />
          뒤로가기
        </button>
        <h1 className="text-2xl font-bold">결제 수단 선택</h1>
      </div>

      {/* 시간 경고 바 */}
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

      {/* 2단 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* 좌측: 결제 수단 */}
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

        {/* 우측: 예매 정보 사이드바 (sticky) */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="bg-white border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-bold">예매 정보</h3>

            <div className="space-y-2 text-sm">
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
              disabled={releaseSeatMutation.isPending}
              className="w-full py-2.5 rounded-lg bg-gray-100 text-text-secondary text-sm hover:bg-gray-200 disabled:opacity-60"
            >
              ← 이전으로
            </button>
          </div>
        </div>
      </div>

      {/* 모달 */}
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
