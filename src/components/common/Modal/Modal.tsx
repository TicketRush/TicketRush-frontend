// components/common/Modal/Modal.tsx
import { type ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import FocusTrap from "focus-trap-react";
import { X } from "lucide-react";
import clsx from "clsx";

export type ModalSize = "sm" | "md" | "lg";
/** default: 사용자 라이트 / admin: 관리자 다크 카드 (#286) */
export type ModalVariant = "default" | "admin";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** sm: 작은 확인 모달 / md: 일반(기본) / lg: 폼이 들어가는 큰 모달 */
  size?: ModalSize;
  variant?: ModalVariant;
  /** 오버레이 클릭으로 닫기 비활성화 (예: 결제 진행 중) */
  disableOverlayClose?: boolean;
  /** ESC로 닫기 비활성화 */
  disableEscClose?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const variantStyles: Record<
  ModalVariant,
  {
    panel: string;
    header: string;
    title: string;
    close: string;
    closeLocked: string;
    body: string;
    footer: string;
  }
> = {
  default: {
    panel: "bg-white shadow-xl",
    header: "border-border",
    title: "text-text",
    close: "text-text-secondary hover:text-text",
    closeLocked: "text-text-disabled cursor-not-allowed",
    body: "text-text",
    footer: "border-border bg-secondary",
  },
  admin: {
    panel: "bg-admin-card border border-admin-border shadow-xl",
    header: "border-admin-border",
    title: "text-admin-text",
    close: "text-admin-text-secondary hover:text-admin-text",
    closeLocked: "text-admin-text-secondary/50 cursor-not-allowed",
    body: "text-admin-text",
    footer: "border-admin-border bg-admin-bg",
  },
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  variant = "default",
  disableOverlayClose = false,
  disableEscClose = false,
}: ModalProps) {
  const titleId = useId();
  // ESC·오버레이가 모두 막힌 요청 진행 중에는 X도 잠근다
  const closeLocked = disableOverlayClose && disableEscClose;
  const theme = variantStyles[variant];

  useEffect(() => {
    if (!isOpen || disableEscClose) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, disableEscClose]);

  useEffect(() => {
    if (!isOpen) return;

    // ⚠️ 단일 모달 기준. nested modal이면 body-scroll-lock 검토.
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
          returnFocusOnDeactivate: true,
          fallbackFocus: '[role="dialog"]',
          // 오버레이·ESC 닫기는 바깥 핸들러에서만 처리한다
          clickOutsideDeactivates: false,
          escapeDeactivates: false,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={clsx(
            "w-full rounded-2xl overflow-hidden outline-none",
            theme.panel,
            sizeStyles[size],
          )}
        >
          {title && (
            <div
              className={clsx(
                "flex items-center justify-between px-6 py-4 border-b",
                theme.header,
              )}
            >
              <h2
                id={titleId}
                className={clsx(
                  "font-pretendard text-lg font-bold",
                  theme.title,
                )}
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={closeLocked}
                className={clsx(
                  "transition-colors",
                  closeLocked ? theme.closeLocked : theme.close,
                )}
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div
            className={clsx("px-6 py-5 font-pretendard text-base", theme.body)}
          >
            {children}
          </div>

          {footer && (
            <div
              className={clsx(
                "px-6 py-4 border-t flex justify-end gap-2",
                theme.footer,
              )}
            >
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>,
    document.body,
  );
}
