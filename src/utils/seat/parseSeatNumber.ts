// 좌석 번호 파싱 유틸
//
// 백엔드 응답의 seatNumber ("A-1" 형태)를 프론트 편의용 row/col로 분리.
// 좌석맵 렌더링, 정렬 등에 사용.

/** 좌석 파싱 결과 */
export interface ParsedSeatNumber {
  /** 행 ("A", "B", ..., "J") */
  row: string;
  /** 열 (1, 2, ..., 12) */
  col: number;
}

/**
 * seatNumber 문자열을 row/col로 파싱.
 *
 * @example
 *   parseSeatNumber("A-1")  → { row: "A", col: 1 }
 *   parseSeatNumber("J-12") → { row: "J", col: 12 }
 *   parseSeatNumber("잘못") → null
 */
export function parseSeatNumber(seatNumber: string): ParsedSeatNumber | null {
  const match = seatNumber.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return null;
  return {
    row: match[1],
    col: Number(match[2]),
  };
}

/**
 * row + col을 seatNumber 문자열로 조립.
 *
 * @example
 *   formatSeatNumber("A", 1)  → "A-1"
 *   formatSeatNumber("J", 12) → "J-12"
 */
export function formatSeatNumber(row: string, col: number): string {
  return `${row}-${col}`;
}
