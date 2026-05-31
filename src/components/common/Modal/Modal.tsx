// components/common/Modal/Modal.tsx
import { type ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import type FocusTrap from "focus-trap-react";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** sm: 작은 확인 모달 / md: 일반(기본) / lg: 폼이 들어가는 큰 모달 */
  size?: ModalSize;
  /** 오버레이 클릭으로 닫기 비활성화 (예: 결제 진행 중) */
  disableOverlayClose?: boolean;
  /** ESC로 닫기 비활성화 */
  disableEscClose?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm", // 384px — 단순 확인/경고
  md: "max-w-md", // 448px — 기본
  lg: "max-w-lg", // 512px — 폼 포함
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  disableOverlayClose = false,
  disableEscClose = false,
}: ModalProps) {
  // 제목과 aria-labelledby를 연결할 고유 ID
  const titleId = useId();

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen || disableEscClose) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, disableEscClose]);

  // 배경 스크롤 방지
  // ⚠️ 단일 모달 기준으로 동작.
  //    nested modal이 필요해지면 body-scroll-lock 같은 라이브러리 도입 검토.
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (disableOverlayClose) return;
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleOverlayClick}
    >
      <FocusTrap
        focusTrapOptions={{
          // 모달 닫힐 때 원래 포커스 위치로 복귀
          returnFocusOnDeactivate: true,
          // 모달 안에 포커스 가능한 요소가 없을 때의 fallback
          fallbackFocus: '[role="dialog"]',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={[
            "w-full bg-white rounded-2xl shadow-xl overflow-hidden outline-none",
            sizeStyles[size],
          ].join(" ")}
        >
          {/* 헤더 */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2
                id={titleId}
                className="font-pretendard text-lg font-bold text-text"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-text-secondary hover:text-text transition-colors"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* 본문 */}
          <div className="px-6 py-5 font-pretendard text-base text-text">
            {children}
          </div>

          {/* 푸터 */}
          {footer && (
            <div className="px-6 py-4 border-t border-border bg-secondary flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
