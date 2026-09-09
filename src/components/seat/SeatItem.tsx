// 좌석 아이템 컴포넌트
//
// 백엔드 스펙 반영 변경:
//   - seat.seatNumber → seat.seatNumber (aria-label, 툴팁)
// #102: 상태 색은 #96 토큰 + Figma 범례 border. 번호는 채움 위 가독성을 위해 흰색.
import { memo } from "react";
import { Ban } from "lucide-react";
import type { SeatWithStatus, SeatStatus } from "@/types/domain/seat";
import { SEAT_STATUS_LABEL } from "./seatStatusLabel";

interface SeatItemProps {
  seat: SeatWithStatus;
  isSelected: boolean;
  onClick: (seat: SeatWithStatus) => void;
}

const STYLES: Record<SeatStatus | "SELECTED", string> = {
  AVAILABLE:
    "bg-seat-available border-2 border-seat-available hover:opacity-90 hover:-translate-y-0.5 hover:shadow-md text-white",
  HOLD: "bg-seat-holding border-2 border-seat-holding-border cursor-not-allowed text-white",
  SOLD: "bg-seat-sold border-2 border-seat-sold-border cursor-not-allowed text-white",
  SELECTED:
    "bg-seat-selected border-2 border-seat-selected-border text-white shadow-md -translate-y-0.5",
};

function SeatItemImpl({ seat, isSelected, onClick }: SeatItemProps) {
  // HOLD/SOLD가 되면 isSelected보다 실제 status를 우선 (SSE로 선점된 좌석 SELECTED 잔상 방지)
  const visualStatus =
    isSelected && seat.status === "AVAILABLE" ? "SELECTED" : seat.status;
  const isClickable = seat.status === "AVAILABLE";
  const isSold = seat.status === "SOLD";

  return (
    <div className="relative group">
      {/* 좌석 버튼 */}
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => onClick(seat)}
        aria-label={`좌석 ${seat.seatNumber} ${SEAT_STATUS_LABEL[visualStatus]}`}
        aria-pressed={isClickable ? visualStatus === "SELECTED" : undefined}
        className={`relative z-0 w-8 h-8 rounded-md text-[10px] font-bold transition-all duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white ${STYLES[visualStatus]}`}
      >
        {/* 매진 좌석엔 🚫 아이콘, 그 외엔 좌석 번호 (col) */}
        {isSold ? (
          <Ban
            size={14}
            className="absolute inset-0 m-auto opacity-50"
            strokeWidth={2.5}
            aria-hidden
          />
        ) : (
          <span>{seat.col}</span>
        )}
      </button>

      {/* 호버·키보드 포커스 툴팁 */}
      <div
        className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150
          bg-gray-800 text-white text-[10px] font-semibold rounded px-1.5 py-0.5 whitespace-nowrap"
        role="tooltip"
      >
        {seat.seatNumber}
      </div>
    </div>
  );
}

export const SeatItem = memo(SeatItemImpl, (prev, next) => {
  return (
    prev.seat.id === next.seat.id &&
    prev.seat.status === next.seat.status &&
    prev.isSelected === next.isSelected
  );
});

export default SeatItem;
