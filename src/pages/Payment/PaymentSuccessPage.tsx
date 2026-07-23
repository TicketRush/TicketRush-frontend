// 결제 확인 페이지 — `/concerts/:id/payment/success`
//
// 이슈 #126: Toss 결제창에서 결제가 성공하면 이 라우트로 "전체 페이지 리다이렉트"된다.
// successUrl 쿼리에 paymentKey, orderId, amount가 Toss에 의해 자동으로 붙는다.
//
// ⚠️ 전체 페이지 리다이렉트이므로 브라우저가 완전히 새로 로드되어 SPA가 재부팅된다.
//   - bookingId/seatId/provider(method)는 paymentStore(sessionStorage persist)에서 복원
//   - paymentKey/orderId/amount는 Toss가 붙여준 쿼리 파라미터에서 읽음
//
// 여기서 POST /api/v1/payment/confirm 을 호출해 결제를 최종 확정한다.
// 성공 → 좌석 SOLD 처리 확인 후 예매 상세(영수증) 페이지로 이동.
// 실패(백엔드 검증 실패, 금액 불일치 등) → /payment/failed 로 이동.

import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePaymentStore } from "@/stores/reservation/paymentStore";
import { usePaymentConfirm } from "@/hooks/mutations/usePaymentConfirm";
import { useReservationLifecycle } from "@/hooks/useReservationLifecycle";

export default function PaymentSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bookingId = usePaymentStore((s) => s.bookingId);
  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const seatId = usePaymentStore((s) => s.seatId);
  const provider = usePaymentStore((s) => s.method);

  const paymentConfirmMutation = usePaymentConfirm();
  const { handlePaymentSuccess, handlePaymentFail } =
    useReservationLifecycle();

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  const startConfirming = usePaymentStore((s) => s.startConfirming);

  // StrictMode 이중 마운트/리렌더로 confirm이 중복 호출되는 것을 방지
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;

    // 직접 URL 진입, 세션 만료 등으로 필요한 정보가 없으면 처리 불가
    // orderId는 Toss가 bookingNumber로 돌려주므로 store 값과 일치해야 함
    if (
      !paymentKey ||
      !amount ||
      !orderId ||
      bookingId == null ||
      seatId == null ||
      !provider ||
      !bookingNumber ||
      orderId !== bookingNumber
    ) {
      navigate(`/concerts/${id}/payment/failed`, { replace: true });
      return;
    }

    requestedRef.current = true;
    startConfirming();

    paymentConfirmMutation
      .mutateAsync({
        bookingId,
        seatId,
        provider,
        amount: Number(amount),
        paymentKey,
      })
      .then(() => {
        handlePaymentSuccess({
          onNavigate: () =>
            navigate(`/reservations/${bookingNumber}`, { replace: true }),
        });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "결제 확인에 실패했습니다.";
        handlePaymentFail(message, {
          onNavigate: () =>
            navigate(`/concerts/${id}/payment/failed`, { replace: true }),
        });
      });
    // 마운트 시 1회만 실행 — 쿼리 파라미터/스토어 값은 리다이렉트 직후 고정값
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-text-secondary">결제를 확인하고 있습니다...</p>
      </div>
    </div>
  );
}
