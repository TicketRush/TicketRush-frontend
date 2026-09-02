import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { AlertTriangle } from "lucide-react";
import { usePaymentStore } from "@/stores/reservation/paymentStore";

interface PaymentFailedModalProps {
  onClose: () => void;
  /** PENDING을 유지한 채 결제만 재시도 */
  onRetry?: () => void;
  /** 스토어 errorMessage 대신 표시할 안내. */
  message?: string;
  closePending?: boolean;
}

export default function PaymentFailedModal({
  onClose,
  onRetry,
  message,
  closePending = false,
}: PaymentFailedModalProps) {
  const storeErrorMessage = usePaymentStore((s) => s.errorMessage);
  const titleId = useId();
  const descId = useId();
  const reason =
    message || storeErrorMessage || "결제가 완료되지 않았습니다.";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || closePending) return;
      if (onRetry) onRetry();
      else onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose, onRetry, closePending]);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          clickOutsideDeactivates: false,
          returnFocusOnDeactivate: true,
          fallbackFocus: '[role="dialog"]',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl outline-none"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
            <AlertTriangle size={36} className="text-yellow-600" />
          </div>
          <h2 id={titleId} className="text-lg font-bold mb-2">
            결제 실패
          </h2>
          <p
            id={descId}
            className="text-sm text-text-secondary leading-relaxed mb-6"
          >
            {reason}
            <br />
            청구는 발생하지 않았습니다.
          </p>
          <div className={`grid gap-2 ${onRetry ? "grid-cols-2" : ""}`}>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={closePending}
                className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                다시 시도
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={closePending}
              className="w-full py-3 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {closePending ? "처리 중..." : "좌석으로 돌아가기"}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
