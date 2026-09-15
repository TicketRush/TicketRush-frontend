/**
 * 백엔드 1-based `seat_row` → 좌석맵 행 라벨 ("A"…"Z").
 * 백엔드 배치 생성은 최대 26행.
 */
export function seatRowToLetter(seatRow: number): string {
  if (!Number.isInteger(seatRow) || seatRow < 1) {
    return "?";
  }
  if (seatRow <= 26) {
    return String.fromCharCode(64 + seatRow);
  }
  return `R${seatRow}`;
}
