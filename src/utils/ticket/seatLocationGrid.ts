import { safeParseSeatNumber } from "@/utils/seat/parseSeatNumber";

const DEFAULT_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const DEFAULT_COLS = 12;

export interface SeatLocationGrid {
  rows: string[];
  colCount: number;
  targetRow: string | null;
  targetCol: number | null;
}

/**
 * 티켓 좌석 위치 맵 범위.
 * 기본은 A–J, 12열이고, 좌석이 그 밖이면 해당 칸이 포함되도록 늘린다.
 */
export function buildSeatLocationGrid(seatLabel: string): SeatLocationGrid {
  const parsed = safeParseSeatNumber(seatLabel.trim(), { row: "", col: 0 });
  if (!parsed.row || parsed.col < 1) {
    return {
      rows: DEFAULT_ROWS,
      colCount: DEFAULT_COLS,
      targetRow: null,
      targetCol: null,
    };
  }

  let rows = DEFAULT_ROWS;
  if (/^[A-Z]$/.test(parsed.row)) {
    const count = parsed.row.charCodeAt(0) - "A".charCodeAt(0) + 1;
    if (count > DEFAULT_ROWS.length) {
      rows = Array.from({ length: count }, (_, index) =>
        String.fromCharCode("A".charCodeAt(0) + index),
      );
    }
  } else if (!DEFAULT_ROWS.includes(parsed.row)) {
    rows = [...DEFAULT_ROWS, parsed.row];
  }

  return {
    rows,
    colCount: Math.max(DEFAULT_COLS, parsed.col),
    targetRow: parsed.row,
    targetCol: parsed.col,
  };
}
