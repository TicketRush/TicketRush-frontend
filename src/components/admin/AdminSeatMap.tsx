// AdminSeatMap
//
// 백엔드 스펙 반영 변경:
//   - seat.seatNumber → seat.seatNumber (aria-label)
//   - #279: layout이 있으면 그리드 크기 기준으로 캡션/정렬 힌트
import { memo } from "react";
import type { SeatLayoutSize, SeatWithStatus } from "@/types/domain/seat";

interface AdminSeatMapProps {
  seats: SeatWithStatus[];
  selectedSeatId: number | null;
  onSeatClick: (seat: SeatWithStatus) => void;
  /** 좌석 크기 배율 (사진 0.7배 요청) */
  scale?: number;
  layout?: SeatLayoutSize | null;
}

export default function AdminSeatMap({
  seats,
  selectedSeatId,
  onSeatClick,
  scale = 0.7,
  layout = null,
}: AdminSeatMapProps) {
  // 행별로 그룹화
  const rowMap = new Map<string, SeatWithStatus[]>();
  seats.forEach((s) => {
    if (!rowMap.has(s.row)) rowMap.set(s.row, []);
    rowMap.get(s.row)!.push(s);
  });
  const rows = Array.from(rowMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // 0.7배: 기본 32px → 22px, gap 6px → 4px
  const seatSize = Math.round(32 * scale);
  const seatGap = Math.round(6 * scale);
  const fontSize = Math.round(10 * scale);

  const colCount =
    layout?.maxCols ??
    rows.reduce(
      (max, [, seatsInRow]) =>
        Math.max(max, ...seatsInRow.map((s) => s.col), 0),
      0,
    );
  const rowCount = layout?.totalRows ?? rows.length;

  return (
    <div className="space-y-3">
      {/* STAGE */}
      <div className="flex justify-center mb-6">
        <div className="px-12 py-2 rounded bg-admin-border text-admin-text-secondary text-sm">
          STAGE
        </div>
      </div>

      {/* 좌석 행들 */}
      <div className="space-y-1.5 flex flex-col items-center">
        {rows.map(([row, seatsInRow]) => (
          <div
            key={row}
            className="flex items-center"
            style={{ gap: `${seatGap}px` }}
          >
            <span className="w-6 text-center text-xs font-bold text-admin-text-secondary">
              {row}
            </span>
            <div className="flex" style={{ gap: `${seatGap}px` }}>
              {seatsInRow
                .sort((a, b) => a.col - b.col)
                .map((seat) => (
                  <AdminSeatItem
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatId === seat.id}
                    size={seatSize}
                    fontSize={fontSize}
                    onClick={onSeatClick}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {rowCount > 0 && colCount > 0 && (
        <p className="text-center text-[10px] text-admin-text-secondary mt-2">
          {rowCount} × {colCount}
        </p>
      )}
    </div>
  );
}

interface SeatItemProps {
  seat: SeatWithStatus;
  isSelected: boolean;
  size: number;
  fontSize: number;
  onClick: (seat: SeatWithStatus) => void;
}

const AdminSeatItem = memo(
  function AdminSeatItemImpl({
    seat,
    isSelected,
    size,
    fontSize,
    onClick,
  }: SeatItemProps) {
    const baseClass =
      "flex-1 aspect-square min-w-0 rounded flex items-center justify-center font-bold transition-all cursor-pointer";

    let stateClass = "";

    if (seat.status === "AVAILABLE") {
      stateClass =
        "bg-admin-seat-available hover:bg-admin-seat-available-hover text-gray-800";
    } else if (seat.status === "SOLD") {
      stateClass = "bg-admin-seat-sold text-gray-700";
    } else if (seat.status === "HOLD") {
      stateClass = "animate-admin-seat-blink text-gray-800";
    }

    return (
      <button
        type="button"
        onClick={() => onClick(seat)}
        className={`${baseClass} ${stateClass}`}
        style={{
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
          fontSize: `${fontSize}px`,
          outline: isSelected ? "2px solid white" : undefined,
          outlineOffset: isSelected ? "2px" : undefined,
        }}
        aria-label={`좌석 ${seat.seatNumber} ${seat.status}`}
      >
        {seat.col}
      </button>
    );
  },
  (prev, next) =>
    prev.seat.id === next.seat.id &&
    prev.seat.status === next.seat.status &&
    prev.isSelected === next.isSelected &&
    prev.size === next.size,
);
