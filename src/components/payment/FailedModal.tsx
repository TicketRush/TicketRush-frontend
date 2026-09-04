import { AlertTriangle } from "lucide-react";
import { usePaymentStore } from "@/stores/reservation/paymentStore";

interface PaymentFailedModalProps {
  onClose: () => void;
  /** PENDING을 유지한 채 결제만 재시도 (#167) */
  onRetry?: () => void;
}

export default function PaymentFailedModal({
  onClose,
  onRetry,
}: PaymentFailedModalProps) {
  const errorMessage = usePaymentStore((s) => s.errorMessage);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
          <AlertTriangle size={36} className="text-yellow-600" />
        </div>
        <h2 className="text-lg font-bold mb-2">결제 실패</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          {errorMessage || "결제가 완료되지 않았습니다."}
          <br />
          청구는 발생하지 않았습니다.
        </p>
        <div className={`grid gap-2 ${onRetry ? "grid-cols-2" : ""}`}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90"
            >
              다시 시도
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600"
          >
            좌석으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
