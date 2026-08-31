// 결제 실패 페이지 — `/concerts/:id/payment/failed`
//
// 도달 경로:
//   1. Toss 결제창 자체 실패(카드 거절 등) → Toss가 failUrl로 리다이렉트
//      (code, message, orderId 쿼리 파라미터 포함)
//   2. 백엔드 POST /payment/confirm 실패 → PaymentSuccessPage에서 이동
//      (paymentStore.errorMessage에 이유가 담겨있음)
//   3. 직접 URL 진입 (fallback)
//
// ⚠️ PaymentPage 내부의 PaymentFailedModal은 "결제창이 열리기도 전에 실패"한
//   경우(SDK 자체 오류, 예: 사용자가 결제창을 닫음)에만 뜨는 별개 케이스이며,
//   그 경우엔 페이지 이동이 없어 여기까지 오지 않는다.
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { usePaymentStore } from "@/stores/reservation/paymentStore";

export default function PaymentFailedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bookingNumber = usePaymentStore((s) => s.bookingNumber);
  const storeErrorMessage = usePaymentStore((s) => s.errorMessage);
  const retryPayment = usePaymentStore((s) => s.retryPayment);

  // Toss가 결제창 자체 실패 시 붙여주는 쿼리 파라미터
  const tossMessage = searchParams.get("message");
  const reason = tossMessage || storeErrorMessage || "결제가 완료되지 않았습니다.";

  // 예매(PENDING) 정보가 세션에 남아있으면 좌석 재선택 없이 결제만 재시도 가능
  const canRetry = !!bookingNumber;

  function handleRetry() {
    retryPayment();
    navigate(`/concerts/${id}/payment`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
          <AlertTriangle size={36} className="text-yellow-600" />
        </div>
        <h2 className="text-lg font-bold mb-2">결제 실패</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          {reason}
          <br />
          청구는 발생하지 않았습니다.
        </p>

        <div className={`grid gap-2 ${canRetry ? "grid-cols-2" : ""}`}>
          {canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90"
            >
              다시 시도
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/concerts/${id}/seats`)}
            className="w-full py-3 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600"
          >
            좌석으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
