// 좌석맵 응답 정규화 (#279)
// - 신: { layout: { totalRows, maxCols } | null, seats: [...] } (+ seatRow/seatCol)
// - 구: seats 배열 → seat_number 파싱
// - 좌표 일부 누락 시 전체 seat_number 폴백 (grid[undefined] 방지)
import type {
  SeatLayoutSize,
  SeatMapData,
  SeatStatus,
  SeatWithStatus,
} from "@/types/domain/seat";
import { safeParseSeatNumber } from "@/utils/seat/parseSeatNumber";
import { seatRowToLetter } from "@/utils/seat/seatRowToLetter";

/** 백엔드 좌석맵 항목 (axios-case-converter 이후 camelCase) */
export interface BackendSeatMapItem {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  holdExpiredAt?: string;
  seatRow?: number | null;
  seatCol?: number | null;
}

export interface BackendSeatLayoutSize {
  totalRows: number;
  maxCols: number;
}

/** 신 계약 객체 응답 (layout은 ALWAYS가 정상이나 생략도 방어) */
export interface BackendSeatMapObject {
  layout?: BackendSeatLayoutSize | null;
  seats?: BackendSeatMapItem[];
}

export type BackendSeatLayoutsResult =
  | BackendSeatMapItem[]
  | BackendSeatMapObject;

function isValidSeatCoord(value: number | null | undefined): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

function hasSeatCoordinates(
  item: Pick<BackendSeatMapItem, "seatRow" | "seatCol">,
): boolean {
  return isValidSeatCoord(item.seatRow) && isValidSeatCoord(item.seatCol);
}

/** 모든 좌석에 좌표가 있을 때만 true (빈 배열은 false → 파싱 경로) */
export function seatsHaveAllCoordinates(
  seats: Pick<BackendSeatMapItem, "seatRow" | "seatCol">[],
): boolean {
  return seats.length > 0 && seats.every(hasSeatCoordinates);
}

export function mapSeatMapItem(
  item: BackendSeatMapItem,
  useCoordinates: boolean,
): SeatWithStatus {
  const position =
    useCoordinates && hasSeatCoordinates(item)
      ? { row: seatRowToLetter(item.seatRow!), col: item.seatCol! }
      : safeParseSeatNumber(item.seatNumber);

  return {
    id: item.seatId,
    seatLayoutId: item.seatLayoutId,
    seatNumber: item.seatNumber,
    row: position.row,
    col: position.col,
    status: item.seatStatus,
  };
}

export function toLayoutSize(
  layout: BackendSeatLayoutSize | null | undefined,
): SeatLayoutSize | null {
  if (layout == null) return null;
  const totalRows = Number(layout.totalRows);
  const maxCols = Number(layout.maxCols);
  if (
    !Number.isInteger(totalRows) ||
    !Number.isInteger(maxCols) ||
    totalRows < 1 ||
    maxCols < 1
  ) {
    return null;
  }
  return { totalRows, maxCols };
}

/**
 * seat-layouts `result` (배열 또는 `{ layout, seats }`) → SeatMapData.
 * - layout === null (ALWAYS) → 배치 미생성
 * - layout 키 생략 + seats=[] 도 미생성으로 방어 (관리자 NON_NULL과 동일 휴리스틱)
 */
export function normalizeSeatMapResponse(
  data: BackendSeatLayoutsResult | null | undefined,
): SeatMapData {
  if (data == null) {
    return { layout: null, layoutReady: true, seats: [] };
  }

  // 구 계약: 좌석 배열
  if (Array.isArray(data)) {
    return {
      layout: null,
      layoutReady: true,
      seats: data.map((item) => mapSeatMapItem(item, false)),
    };
  }

  if (typeof data !== "object") {
    return { layout: null, layoutReady: true, seats: [] };
  }

  const rawSeats = data.seats ?? [];

  // 신 계약 미생성: layout null(명시) 또는 키 생략 + 빈 seats
  if (data.layout == null && rawSeats.length === 0) {
    return { layout: null, layoutReady: false, seats: [] };
  }

  const useCoordinates = seatsHaveAllCoordinates(rawSeats);

  return {
    layout: toLayoutSize(data.layout),
    layoutReady: true,
    seats: rawSeats.map((item) => mapSeatMapItem(item, useCoordinates)),
  };
}
