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
import type { PaymentMethod } from "@/types/domain/payment";

// ⚠️ PaymentMethod 타입 값이 다르면 여기서 수정 필요 (KAKAOPAY/NAVERPAY/TOSSPAY 가정)
const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  initial: string;
  bgColor: string;
  textColor: string;
}> = [
  {
    value: "KAKAOPAY" as PaymentMethod,
    label: "카카오페이",
    initial: "K",
    bgColor: "bg-[#FEE500]",
    textColor: "text-yellow-900",
  },
  {
    value: "NAVERPAY" as PaymentMethod,
    label: "네이버페이",
    initial: "N",
    bgColor: "bg-[#03C75A]",
    textColor: "text-white",
  },
  {
    value: "TOSSPAY" as PaymentMethod,
    label: "토스페이",
    initial: "T",
    bgColor: "bg-[#0064FF]",
    textColor: "text-white",
  },
];

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const selectedSeat = useSeatStore((s) => s.selectedSeat);
  const currentConcert = useConcertStore((s) => s.currentConcert);
  const { formatted, mm } = useTimerDisplay();
  const timerStatus = useTimerStore((s) => s.status);

  const paymentStatus = usePaymentStore((s) => s.status);
  const setMethod = usePaymentStore((s) => s.setMethod);
  const expire = usePaymentStore((s) => s.expire);
  const fail = usePaymentStore((s) => s.fail);
  const succeed = usePaymentStore((s) => s.succeed);
  const startRequest = usePaymentStore((s) => s.startRequest);
  const startConfirming = usePaymentStore((s) => s.startConfirming);
  const reset = usePaymentStore((s) => s.reset);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [agreed, setAgreed] = useState(false);

  // 타이머 만료 → paymentStore.expire (모달 띄움)
  useTimerExpiry(() => {
    expire();
  });

  useEffect(() => {
    if (!selectedSeat) {
      navigate(`/concerts/${id}/seats`, { replace: true });
    }
  }, [selectedSeat, id, navigate]);

  if (!selectedSeat) return null;

  function handleSelectMethod(method: PaymentMethod) {
    setSelectedMethod(method);
    setMethod(method);
  }

  async function handlePayment() {
    if (!selectedMethod || !agreed) return;

    try {
      startRequest("mock-payment-key");
      // TODO: Sprint 8 — 실제 PG SDK 호출로 교체
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

      // mock 예매 번호 — 실제로는 백엔드 응답
      const bookingNumber = "X7B29-KLPW1";
      navigate(`/reservations/${bookingNumber}`);
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error("결제에 실패했습니다.");
      fail(err.message);
    }
  }

  function handleCloseTimeoutModal() {
    reset();
    navigate(`/concerts/${id}/seats`);
  }

  function handleClosePaymentFailedModal() {
    reset();
    navigate(`/concerts/${id}/seats`);
  }

  const totalAmount = selectedSeat.price ?? currentConcert?.price ?? 0;

  const isWarning = mm < 1; // 1분 미만
  const canPay =
    !!selectedMethod &&
    agreed &&
    timerStatus === "running" &&
    paymentStatus !== "REQUESTING" &&
    paymentStatus !== "CONFIRMING";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50"
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
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleSelectMethod(m.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    selectedMethod === m.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${m.bgColor} ${m.textColor}`}
                  >
                    {m.initial}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{m.label}</p>
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
              <Row label="좌석" value={selectedSeat.label} />
              <Row
                label="단가"
                value={`₩${selectedSeat.price.toLocaleString()}`}
              />
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
              onClick={() => navigate(-1)}
              className="w-full py-2.5 rounded-lg bg-gray-100 text-text-secondary text-sm hover:bg-gray-200"
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
