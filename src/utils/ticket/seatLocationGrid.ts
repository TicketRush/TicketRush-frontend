import { safeParseSeatNumber } from "@/utils/seat/parseSeatNumber";
import { seatRowToLetter } from "@/utils/seat/seatRowToLetter";

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

export type SeatCellKind = "gap" | "seat" | "mine";

export interface SeatLocationCell {
  col: number;
  kind: SeatCellKind;
}

export interface SeatLocationRow {
  row: string;
  cells: SeatLocationCell[];
}

export interface SeatLocationMap {
  source: "venue" | "schematic";
  rows: SeatLocationRow[];
}

export interface VenueSeatPoint {
  row: string;
  col: number;
  seatNumber: string;
}

function sameSeatLabel(seatLabel: string, seatNumber: string): boolean {
  return seatLabel.trim().toUpperCase() === seatNumber.trim().toUpperCase();
}

function schematicMap(seatLabel: string): SeatLocationMap {
  const grid = buildSeatLocationGrid(seatLabel);
  return {
    source: "schematic",
    rows: grid.rows.map((row) => ({
      row,
      cells: Array.from({ length: grid.colCount }, (_, index) => {
        const col = index + 1;
        const mine = row === grid.targetRow && col === grid.targetCol;
        return { col, kind: mine ? "mine" : "seat" };
      }),
    })),
  };
}

/**
 * 공연 배치에 내 좌석이 있으면 그 좌표를 쓴다.
 * 없는 열은 빈 칸으로 두고, 배치가 없거나 내 좌석이 없으면 개략 맵으로 돌아간다.
 */
function rowRank(row: string): number {
  if (/^[A-Z]$/.test(row)) return row.charCodeAt(0) - 64;
  const numbered = /^R(\d+)$/.exec(row);
  if (numbered) return Number(numbered[1]);
  return Number.MAX_SAFE_INTEGER;
}

function compareRows(a: string, b: string): number {
  const rank = rowRank(a) - rowRank(b);
  return rank === 0 ? a.localeCompare(b) : rank;
}

export function resolveSeatLocationMap(
  seatLabel: string,
  venue?: {
    seats: VenueSeatPoint[];
    maxCols?: number | null;
    totalRows?: number | null;
  } | null,
): SeatLocationMap {
  const seats = venue?.seats ?? [];
  const parsed = safeParseSeatNumber(seatLabel.trim(), { row: "", col: 0 });
  const mine =
    seats.find(
      (seat) =>
        sameSeatLabel(seatLabel, seat.seatNumber) && seat.col >= 1 && seat.row,
    ) ??
    seats.find(
      (seat) =>
        parsed.col >= 1 && seat.row === parsed.row && seat.col === parsed.col,
    );
  if (!mine) return schematicMap(seatLabel);

  const occupied = new Set(seats.map((seat) => `${seat.row}:${seat.col}`));
  const rowSet = new Set(seats.map((seat) => seat.row));
  const totalRows = venue?.totalRows ?? 0;
  if (totalRows > 0) {
    for (let index = 1; index <= totalRows; index += 1) {
      rowSet.add(seatRowToLetter(index));
    }
  }
  const rows = [...rowSet].sort(compareRows);
  const colCount = Math.max(
    venue?.maxCols ?? 0,
    ...seats.map((seat) => seat.col),
  );

  return {
    source: "venue",
    rows: rows.map((row) => ({
      row,
      cells: Array.from({ length: colCount }, (_, index) => {
        const col = index + 1;
        if (row === mine.row && col === mine.col) {
          return { col, kind: "mine" as const };
        }
        if (occupied.has(`${row}:${col}`)) {
          return { col, kind: "seat" as const };
        }
        return { col, kind: "gap" as const };
      }),
    })),
  };
}
