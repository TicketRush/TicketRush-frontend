import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/common/useBodyScrollLock";
import { buildSeatLocationGrid } from "@/utils/ticket/seatLocationGrid";

// 팝오버 열린 직후 이 시간 동안은 배경 클릭 무시 (즉시 닫힘 방지)
const POPOVER_CLICK_GUARD_MS = 200;

function seatCellPx(colCount: number): number {
  if (colCount <= 12) return 16;
  if (colCount <= 24) return 12;
  return 10;
}

export default function SeatMapPopover({
  seatLabel,
  onClose,
}: {
  seatLabel: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const { rows, colCount, targetRow, targetCol } =
    buildSeatLocationGrid(seatLabel);
  const [canClose, setCanClose] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);
  const seatPx = seatCellPx(colCount);

  // 열린 동안만 마운트된다. 스크롤바 폭 보정과 위치 복원은 공통 잠금을 쓴다 (#376, #341).
  useBodyScrollLock(true);

  useEffect(() => {
    const t = window.setTimeout(
      () => setCanClose(true),
      POPOVER_CLICK_GUARD_MS,
    );
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [seatLabel]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  function handleBackgroundClick() {
    if (canClose) onClose();
  }

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        returnFocusOnDeactivate: true,
        fallbackFocus: '[role="dialog"]',
        preventScroll: true,
        // 배경 클릭은 가드 시간이 지난 뒤 이 컴포넌트에서만 닫는다
        clickOutsideDeactivates: false,
        escapeDeactivates: false,
      }}
    >
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50">
        <div
          className="flex min-h-full items-center justify-center px-4 py-4"
          onClick={handleBackgroundClick}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl bg-white p-5 outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id={titleId} className="text-base font-bold">
                좌석 위치
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-text-secondary hover:text-text"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-3 flex justify-center">
              <div className="rounded border-2 border-primary px-6 py-1 text-xs font-semibold text-primary">
                🎤 STAGE
              </div>
            </div>

            <div className="mb-4 max-h-64 space-y-1 overflow-auto">
              {rows.map((row) => (
                <div key={row} className="flex items-center gap-0.5">
                  <div className="w-4 shrink-0 text-center text-[10px] font-bold text-text-secondary">
                    {row}
                  </div>
                  {Array.from({ length: colCount }).map((_, idx) => {
                    const col = idx + 1;
                    const isTarget = row === targetRow && col === targetCol;
                    return (
                      <div
                        key={col}
                        ref={isTarget ? markRef : undefined}
                        data-my-seat={isTarget ? seatLabel : undefined}
                        aria-label={isTarget ? `내 좌석 ${seatLabel}` : undefined}
                        style={{ width: seatPx, height: seatPx }}
                        className={`shrink-0 rounded ${
                          isTarget ? "z-10 bg-primary ring-2 ring-primary" : "bg-gray-200"
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-primary/5 px-3 py-2 text-center">
              <p className="text-xs text-text-secondary">내 좌석</p>
              <p className="text-base font-bold text-primary">{seatLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </FocusTrap>,
    document.body,
  );
}
