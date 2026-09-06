import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { AlertCircle } from "lucide-react";

interface TimeoutModalProps {
  onClose: () => void;
  closePending?: boolean;
}

export default function TimeoutModal({
  onClose,
  closePending = false,
}: TimeoutModalProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closePending) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose, closePending]);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
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
          className="bg-white rounded-[10px] overflow-hidden max-w-[448px] w-full border-[3px] border-[#FB2C36] shadow-2xl outline-none"
        >
          <div className="bg-[#FB2C36] flex items-center justify-center py-6">
            <AlertCircle size={64} className="text-white" strokeWidth={1.75} />
          </div>

          <div className="px-8 pt-8 pb-8 text-center">
            <h2 id={titleId} className="text-lg font-bold text-[#1E2939]">
              예약 제한 시간(5분)이 초과되었습니다.
            </h2>
            <p
              id={descId}
              className="text-base text-[#4A5565] leading-6 mt-3"
            >
              선택하신 좌석의 임시 예약이 자동으로 해제되었습니다.
              <br />
              다시 예매를 진행하시려면 좌석 선택에서 다시 선택해주세요.
            </p>

            <div className="relative mt-6 rounded-[10px] border border-[#D1D5DC] bg-gray-50 px-4 pt-8 pb-4">
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-[#6A6A6A] text-white text-xs font-mono tracking-wide px-2 py-0.5">
                TIP
              </span>
              <p className="text-sm text-[#364153] leading-5">
                <span className="font-bold">좌석 확인을 누른 시점부터</span>
                {" 제한 시간이 시작됩니다."}
              </p>
              <p className="text-sm text-[#364153] leading-5 mt-1">
                결제를 빠르게 완료하시면 예약이 확정됩니다.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={closePending}
              className="mt-8 w-full h-14 rounded-[10px] bg-[#333] text-white text-lg font-bold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
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
