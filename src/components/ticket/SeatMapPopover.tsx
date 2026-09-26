import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/common/useBodyScrollLock";
import {
  resolveSeatLocationMap,
  type VenueSeatPoint,
} from "@/utils/ticket/seatLocationGrid";

// 팝오버 열린 직후 이 시간 동안은 배경 클릭 무시 (즉시 닫힘 방지)
const POPOVER_CLICK_GUARD_MS = 200;

function scrollMarkIntoMap(map: HTMLElement, mark: HTMLElement) {
  const mapRect = map.getBoundingClientRect();
  const markRect = mark.getBoundingClientRect();
  const pad = 4;
  if (markRect.left < mapRect.left + pad) {
    map.scrollLeft -= mapRect.left + pad - markRect.left;
  } else if (markRect.right > mapRect.right - pad) {
    map.scrollLeft += markRect.right - (mapRect.right - pad);
  }
  if (markRect.top < mapRect.top + pad) {
    map.scrollTop -= mapRect.top + pad - markRect.top;
  } else if (markRect.bottom > mapRect.bottom - pad) {
    map.scrollTop += markRect.bottom - (mapRect.bottom - pad);
  }
}

function seatCellPx(colCount: number): number {
  if (colCount <= 12) return 16;
  if (colCount <= 24) return 12;
  return 10;
}

export default function SeatMapPopover({
  seatLabel,
  venue = null,
  layoutPending = false,
  onClose,
}: {
  seatLabel: string;
  venue?: {
    seats: VenueSeatPoint[];
    maxCols?: number | null;
    totalRows?: number | null;
  } | null;
  layoutPending?: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const location = resolveSeatLocationMap(seatLabel, layoutPending ? null : venue);
  const colCount = location.rows.reduce(
    (max, row) => Math.max(max, row.cells.length),
    0,
  );
  const [canClose, setCanClose] = useState(false);
  const markRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
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
    if (layoutPending) return;
    const map = mapRef.current;
    const mark = markRef.current;
    if (!map || !mark) return;
    scrollMarkIntoMap(map, mark);
  }, [seatLabel, layoutPending, location.source]);

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

            <div ref={mapRef} className="mb-4 max-h-64 space-y-1 overflow-auto">
              {layoutPending ? (
                <p className="py-8 text-center text-sm text-text-secondary">
                  좌석 배치를 불러오는 중
                </p>
              ) : (
                location.rows.map((row) => (
                  <div key={row.row} className="flex items-center gap-0.5">
                    <div className="w-max min-w-4 shrink-0 text-center text-[10px] font-bold text-text-secondary">
                      {row.row}
                    </div>
                    {row.cells.map((cell) => {
                      const isTarget = cell.kind === "mine";
                      return (
                        <div
                          key={cell.col}
                          ref={isTarget ? markRef : undefined}
                          data-my-seat={isTarget ? seatLabel : undefined}
                          data-seat-gap={cell.kind === "gap" ? "" : undefined}
                          aria-label={
                            isTarget ? `내 좌석 ${seatLabel}` : undefined
                          }
                          style={{ width: seatPx, height: seatPx }}
                          className={`shrink-0 rounded ${
                            cell.kind === "gap"
                              ? "bg-transparent"
                              : isTarget
                                ? "z-10 bg-primary ring-2 ring-primary"
                                : "bg-gray-200"
                          }`}
                        />
                      );
                    })}
                  </div>
                ))
              )}
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
