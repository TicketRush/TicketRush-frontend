// 좌석 번호 파싱 유틸
//
// 백엔드는 좌석을 "A-1" 형식의 문자열로 반환.
// 프론트에서 좌석맵 렌더링(SeatMap, SeatItem)에는 row("A"), col(1) 두 파생 필드가 필요.
//
// 예: "A-1"  → { row: "A", col: 1 }
//     "AA-12" → { row: "AA", col: 12 }
//     "B-3"   → { row: "B", col: 3 }

/**
 * 좌석 번호 파싱 결과
 */
export interface ParsedSeatNumber {
  row: string;
  col: number;
}

/**
 * "A-1" → { row: "A", col: 1 }
 *
 * @throws 형식이 잘못된 경우 (예: "abc", "1-1", "A1")
 */
export function parseSeatNumber(seatNumber: string): ParsedSeatNumber {
  const match = seatNumber.match(/^([A-Za-z]+)-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid seatNumber format: ${seatNumber}`);
  }
  return {
    row: match[1].toUpperCase(),
    col: parseInt(match[2], 10),
  };
}

/**
 * 파싱 실패 시 fallback 값 반환.
 * 좌석맵 렌더링 중 잘못된 데이터로 인해 전체가 깨지지 않도록 방어용.
 */
export function safeParseSeatNumber(
  seatNumber: string,
  fallback: ParsedSeatNumber = { row: "?", col: 0 },
): ParsedSeatNumber {
  try {
    return parseSeatNumber(seatNumber);
  } catch {
    return fallback;
  }
}
