// 관리자 좌석 맵 — 사용자 SeatMap과 다른 디자인
// 좌석 번호 표시, 색상 별도 (사진 6 기준), 깜빡임 애니메이션 적용

import { memo } from "react";
import type { SeatWithStatus } from "@/types/domain/seat";

interface AdminSeatMapProps {
  seats: SeatWithStatus[];
  selectedSeatId: number | null;
  onSeatClick: (seat: SeatWithStatus) => void;
}

export default function AdminSeatMap({
  seats,
  selectedSeatId,
  onSeatClick,
}: AdminSeatMapProps) {
  // 행별로 그룹화 (A행, B행, ...)
  const rowMap = new Map<string, SeatWithStatus[]>();
  seats.forEach((s) => {
    if (!rowMap.has(s.row)) rowMap.set(s.row, []);
    rowMap.get(s.row)!.push(s);
  });
  const rows = Array.from(rowMap.entries()).sort();

  return (
    <div className="space-y-3">
      {/* STAGE */}
      <div className="flex justify-center mb-6">
        <div className="px-12 py-2 rounded bg-admin-border text-admin-text-secondary text-sm">
          STAGE
        </div>
      </div>

      {/* 좌석 행들 */}
      <div className="space-y-1.5">
        {rows.map(([row, seats]) => (
          <div key={row} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs font-bold text-admin-text-secondary">
              {row}
            </span>
            <div className="flex gap-1.5 flex-1">
              {seats
                .sort((a, b) => a.col - b.col)
                .map((seat) => (
                  <AdminSeatItem
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatId === seat.id}
                    onClick={onSeatClick}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SeatItemProps {
  seat: SeatWithStatus;
  isSelected: boolean;
  onClick: (seat: SeatWithStatus) => void;
}

const AdminSeatItem = memo(
  function AdminSeatItemImpl({ seat, isSelected, onClick }: SeatItemProps) {
    const baseClass =
      "flex-1 aspect-square min-w-0 rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer";

    let stateClass = "";
    if (seat.status === "AVAILABLE") {
      stateClass = "bg-seat-available text-gray-700 hover:bg-seat-available-hover";
    } else if (seat.status === "SOLD") {
      stateClass = "bg-seat-sold text-gray-700";
    } else if (seat.status === "HOLD") {
      // 깜빡임 애니메이션 (tailwind 키프레임)
      stateClass = "animate-seat-blink text-gray-700";
    }

    if (isSelected) {
      stateClass += " ring-2 ring-white ring-offset-2 ring-offset-admin-bg";
    }

    return (
      <button
        type="button"
        onClick={() => onClick(seat)}
        className={`${baseClass} ${stateClass}`}
        aria-label={`좌석 ${seat.label} ${seat.status}`}
      >
        {seat.col}
      </button>
    );
  },
  (prev, next) =>
    prev.seat.id === next.seat.id &&
    prev.seat.status === next.seat.status &&
    prev.isSelected === next.isSelected,
);
