// 좌석 도메인 타입
//
// 백엔드 seat-service swagger (2026-06-30) 스펙 반영
//
// 주요 변경:
//   - Seat.seatNumber → seatNumber (백엔드 필드명)
//   - Seat.row/col → 유지 (프론트에서 좌석맵 렌더링 시 필요, 백엔드 응답의 seatNumber에서 파생)
//   - Seat.seatLayoutId → seatLayoutId (백엔드 필드명)
//   - Seat → 삭제 (공연 단위 가격 사용)
//   - SeatAvailability → SeatCounts로 이름 변경 + 필드 확장 (holdCount, soldCount 추가)
//   - SeatHoldResponse → 삭제 (백엔드에 별도 HOLD API 없음. 예매 생성이 좌석 HOLD를 겸함 — booking.ts 참고)

/** 좌석 상태 — 백엔드 enum과 일치 */
export type SeatStatus = "AVAILABLE" | "HOLD" | "SOLD";

/**
 * 좌석 도메인 모델
 *
 * row/col은 가능하면 백엔드 `seatRow`/`seatCol`(1-based)에서 오고,
 * 좌표가 없으면 seatNumber("A-1") 파싱으로 폴백한다 (#279).
 */
export interface Seat {
  /** 백엔드 seatId */
  id: number;
  /** 백엔드 seatLayoutId */
  seatLayoutId: number;
  /** 백엔드 필드명 seatNumber (예: "A-1") — 표시용 */
  seatNumber: string;
  /** 행 라벨 (예: "A") — seatRow→문자 또는 seatNumber 파싱 */
  row: string;
  /** 열 번호 (예: 1) — seatCol 또는 seatNumber 파싱 */
  col: number;
}

/** 백엔드 layout 크기 — totalRows × maxCols (좌석 수와 다를 수 있음, 부분 행) */
export interface SeatLayoutSize {
  totalRows: number;
  maxCols: number;
}

/**
 * 좌석맵 조회 결과 (#279).
 * - layoutReady=false: 신 계약 `layout: null` (배치 미생성)
 * - layout: 그리드 크기. 구 배열 응답·관리자 구버전은 null일 수 있음(좌석에서 파생)
 */
export interface SeatMapData {
  layout: SeatLayoutSize | null;
  layoutReady: boolean;
  seats: SeatWithStatus[];
}

/** 좌석 + 현재 상태 (좌석 맵 표시용) */
export interface SeatWithStatus extends Seat {
  status: SeatStatus;
}

/**
 * 좌석 상태별 카운트 — 백엔드 SeatCountsResponse 대응
 *
 * 백엔드 응답 필드는 snake_case (total_count, available_count 등)이지만
 * axios-case-converter가 자동으로 camelCase로 변환.
 */
export interface SeatCounts {
  totalCount: number;
  availableCount: number;
  holdCount: number;
  soldCount: number;
}

/**
 * SSE 이벤트 페이로드 — 백엔드 SeatStatusChangedResponse 대응 (이슈 #123, BE 소스 확인 완료)
 *
 * 백엔드 원본 필드(snake_case): performance_id, seat_id, seat_layout_id,
 * seat_number, seat_status, hold_expired_at.
 * EventSource는 axios를 거치지 않아 axios-case-converter가 적용되지 않으므로,
 * subscribeSeatStream 내부에서 snake_case → camelCase로 직접 변환해 이 타입으로 전달한다.
 *
 * hold_expired_at은 백엔드 Jackson NON_NULL 설정으로 null일 때 필드 자체가 생략됨
 * (HOLD가 아닌 상태에서는 대부분 없음).
 */
export interface SeatUpdateEvent {
  seatId: number;
  status: SeatStatus;
  performanceId?: number;
  seatLayoutId?: number;
  seatNumber?: string;
  /** HOLD 만료 예정 시각 — 백엔드 포맷 "yyyy-MM-dd HH:mm:ss" (ISO 아님). 결제 타이머가 아님 (#167) */
  holdExpiredAt?: string;
  /** @deprecated 백엔드 페이로드에 없음. Mock 시뮬레이터 호환용으로만 유지. */
  timestamp?: string;
}

/**
 * 좌석 배치 조회 항목 — 백엔드 SeatMapItemResponse 대응 (#279)
 *
 * GET /api/v1/seat/{performanceId}/seat-layouts 의 seats[] 요소.
 * 신 계약은 seatRow/seatCol 포함. 구 배열 응답에는 좌표가 없을 수 있음.
 */
export interface SeatLayoutResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
  seatStatus?: SeatStatus;
  seatRow?: number | null;
  seatCol?: number | null;
  holdExpiredAt?: string;
}
