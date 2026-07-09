// 좌석 도메인 타입
//
// 백엔드 seat-service swagger (2026-06-30) 스펙 반영
//
// 주요 변경:
//   - Seat.label → seatNumber (백엔드 필드명)
//   - Seat.row/col → 유지 (프론트에서 좌석맵 렌더링 시 필요, 백엔드 응답의 seatNumber에서 파생)
//   - Seat.layoutId → seatLayoutId (백엔드 필드명)
//   - Seat.price → 삭제 (공연 단위 가격 사용)
//   - SeatAvailability → SeatCounts로 이름 변경 + 필드 확장 (holdCount, soldCount 추가)
//   - SeatHoldResponse → 삭제 (백엔드에 별도 HOLD API 없음. 예매 생성이 좌석 HOLD를 겸함 — booking.ts 참고)

/** 좌석 상태 — 백엔드 enum과 일치 */
export type SeatStatus = "AVAILABLE" | "HOLD" | "SOLD";

/**
 * 좌석 도메인 모델
 *
 * 백엔드 응답(seatNumber="A-1")을 프론트에서 편의 필드(row, col)로 파생시켜 사용.
 * 파싱 유틸: utils/seat/parseSeatNumber.ts 참고 (신규 생성 필요)
 */
export interface Seat {
  /** 백엔드 seatId */
  id: number;
  /** 백엔드 seatLayoutId */
  seatLayoutId: number;
  /** 백엔드 필드명 seatNumber (예: "A-1") */
  seatNumber: string;
  /** 파생 필드 — seatNumber에서 파싱 (예: "A") */
  row: string;
  /** 파생 필드 — seatNumber에서 파싱 (예: 1) */
  col: number;
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

/** SSE 이벤트 페이로드 — 백엔드 확정 대기 (가상 스펙) */
export interface SeatUpdateEvent {
  seatId: number;
  status: SeatStatus;
  /** ISO datetime */
  timestamp: string;
}

/**
 * 좌석 배치 조회 응답 — 백엔드 SeatLayoutResponse 대응
 *
 * seat-service의 GET /api/v1/seat/{performanceId}/seat-layouts 응답 배열의 요소.
 * 프론트에서는 이 응답을 SeatWithStatus로 변환하여 사용:
 *   1. seat-layouts로 좌석 목록 조회
 *   2. seat-counts로 상태별 카운트 조회
 *   3. SSE로 개별 좌석 상태 업데이트 수신
 */
export interface SeatLayoutResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
}
