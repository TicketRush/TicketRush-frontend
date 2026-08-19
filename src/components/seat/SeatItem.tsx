// 좌석 아이템 컴포넌트
//
// 백엔드 스펙 반영 변경:
//   - seat.seatNumber → seat.seatNumber (aria-label, 툴팁)
import { memo } from "react";
import { Ban } from "lucide-react";
import type { SeatWithStatus, SeatStatus } from "@/types/domain/seat";

interface SeatItemProps {
  seat: SeatWithStatus;
  isSelected: boolean;
  onClick: (seat: SeatWithStatus) => void;
}

const STYLES: Record<SeatStatus | "SELECTED", string> = {
  AVAILABLE:
    "bg-white border border-seat-available hover:bg-seat-available/10 hover:-translate-y-0.5 hover:shadow-md text-gray-700",
  HOLD: "bg-seat-holding border border-seat-holding cursor-not-allowed text-white",
  SOLD: "bg-seat-sold border border-seat-sold cursor-not-allowed text-white",
  SELECTED:
    "bg-seat-selected border border-seat-selected text-white shadow-md -translate-y-0.5",
};

function SeatItemImpl({ seat, isSelected, onClick }: SeatItemProps) {
  const visualStatus = isSelected ? "SELECTED" : seat.status;
  const isClickable = seat.status === "AVAILABLE";
  const isSold = seat.status === "SOLD";

  return (
    <div className="relative group">
      {/* 좌석 버튼 */}
      <button
        type="button"
        disabled={!isClickable}
        onClick={() => onClick(seat)}
        aria-label={`좌석 ${seat.seatNumber} ${seat.status}`}
        className={`relative w-8 h-8 rounded-md text-[10px] font-bold transition-all duration-150 ${STYLES[visualStatus]}`}
      >
        {/* 매진 좌석엔 🚫 아이콘, 그 외엔 좌석 번호 (col) */}
        {isSold ? (
          <Ban
            size={14}
            className="absolute inset-0 m-auto opacity-50"
            strokeWidth={2.5}
          />
        ) : (
          <span>{seat.col}</span>
        )}
      </button>

      {/* 호버 툴팁 */}
      <div
        className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none
          opacity-0 group-hover:opacity-100 transition-opacity duration-150
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
