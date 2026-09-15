// 좌석 맵 — 행별 그룹화 + 행/열 라벨
import SeatItem from "./SeatItem";
import type { SeatWithStatus } from "@/types/domain/seat";
import { useMemo } from "react";

interface SeatMapProps {
  seats: SeatWithStatus[];
  selectedSeatId: number | null;
  onSeatClick: (seat: SeatWithStatus) => void;
}

export default function SeatMap({
  seats,
  selectedSeatId,
  onSeatClick,
}: SeatMapProps) {
  // 행별로 그룹화 (A행, B행, ...)
  const rows = useMemo(() => {
    const rowMap = new Map<string, SeatWithStatus[]>();
    seats.forEach((seat) => {
      if (!rowMap.has(seat.row)) rowMap.set(seat.row, []);
      rowMap.get(seat.row)!.push(seat);
    });
    // 행 이름순 정렬 (A → J), 각 행 내부는 col 순
    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rowName, seatsInRow]) => ({
        row: rowName,
        seats: seatsInRow.sort((a, b) => a.col - b.col),
      }));
  }, [seats]);

  // 가장 긴 행 기준 (헤더·캡션). 빈 배치는 헤더를 그리지 않는다.
  const colCount = rows.reduce(
    (max, row) => Math.max(max, row.seats.length),
    0,
  );

  return (
    <div className="inline-block">
      {/* 열 번호 헤더 */}
      <div className="flex items-center gap-1.5 mb-2">
        {/* 좌측 행 라벨 칸 비우기 */}
        <div className="w-6" />
        {Array.from({ length: colCount }).map((_, i) => (
          <div
            key={i}
            className="w-8 text-center text-[10px] font-semibold text-text-secondary"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* 좌석 행들 */}
      <div className="space-y-2">
        {rows.map(({ row, seats: seatsInRow }) => (
          <div key={row} className="flex items-center gap-1.5">
            {/* 행 라벨 */}
            <div className="w-6 text-center text-xs font-bold text-text-secondary">
              {row}
            </div>
            {/* 좌석들 */}
            {seatsInRow.map((seat) => (
              <SeatItem
                key={seat.id}
                seat={seat}
                isSelected={selectedSeatId === seat.id}
                onClick={onSeatClick}
              />
            ))}
          </div>
        ))}
      </div>

      {rows.length > 0 && colCount > 0 && (
        <p className="text-center text-[10px] text-text-secondary mt-4">
          [Seat Grid: {rows.length} rows × {colCount} columns]
        </p>
      )}
    </div>
  );
}
