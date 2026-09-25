// 좌석 맵 — 행별 그룹화 + 행/열 라벨
// layout이 있으면 헤더·캡션 크기는 totalRows × maxCols (#279)
import SeatItem from "./SeatItem";
import type { SeatLayoutSize, SeatWithStatus } from "@/types/domain/seat";
import { findAdjacentSeat, resolveSeatArrowKey } from "@/utils/seat/adjacentSeat";
import { placeSeatsInColumns } from "@/utils/seat/seatColumns";
import { useMemo, type KeyboardEvent } from "react";

interface SeatMapProps {
  seats: SeatWithStatus[];
  selectedSeatId: number | null;
  onSeatClick: (seat: SeatWithStatus) => void;
  /** 백엔드 layout — 있으면 그리드 크기로 사용 (좌석 수·고정 10×12 비의존) */
  layout?: SeatLayoutSize | null;
}

export default function SeatMap({
  seats,
  selectedSeatId,
  onSeatClick,
  layout = null,
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

  // layout 우선. 없으면 실제 최대 col (좌석 개수 아님 — 구멍 있는 행 대비)
  const dataMaxCol = rows.reduce(
    (max, row) => Math.max(max, ...row.seats.map((seat) => seat.col), 0),
    0,
  );
  const colCount = Math.max(layout?.maxCols ?? 0, dataMaxCol);
  const rowCount = layout?.totalRows ?? rows.length;

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = resolveSeatArrowKey(event);
    if (!direction) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const currentId = Number(target.dataset.seatId);
    if (!Number.isFinite(currentId)) return;
    event.preventDefault();
    event.stopPropagation();
    const next = findAdjacentSeat(seats, currentId, direction);
    if (!next) return;
    const button = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-seat-id="${next.id}"]`,
    );
    button?.focus();
  };

  return (
    <div className="inline-block" onKeyDown={moveFocus}>
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
            {placeSeatsInColumns(seatsInRow, colCount).map((seat, index) =>
              seat ? (
                <SeatItem
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeatId === seat.id}
                  onClick={onSeatClick}
                />
              ) : (
                <div key={`${row}-empty-${index}`} className="w-8 h-8" aria-hidden />
              ),
            )}
          </div>
        ))}
      </div>

      {rowCount > 0 && colCount > 0 && (
        <p className="text-center text-[10px] text-text-secondary mt-4">
          [Seat Grid: {rowCount} rows × {colCount} columns]
        </p>
      )}
    </div>
  );
}
