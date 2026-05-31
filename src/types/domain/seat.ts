// 좌석 도메인 타입
// 백엔드 swagger 일부 확정: SeatLayoutResponse, SeatAvailabilityResponse, SeatStatus(HOLD/SOLD)
// 가상 스펙: 좌석 + 상태 통합 조회, 좌석 HOLD/RELEASE, SSE

export type SeatStatus = "AVAILABLE" | "HOLD" | "SOLD";

/** 좌석 도메인 모델 (seatStore에서도 동일하게 사용) */
export interface Seat {
  /** 백엔드 seatId */
  id: number;
  /** 백엔드 seatLayoutId */
  layoutId: number;
  /** UI 표시용 (예: "A-1") */
  label: string;
  row: string;
  col: number;
  price: number;
}

/** 좌석 + 현재 상태 (좌석 맵 표시용) */
export interface SeatWithStatus extends Seat {
  status: SeatStatus;
}

/** 좌석 잔여 수 (swagger 확정) */
export interface SeatAvailability {
  availableCount: number;
  totalCount: number;
}

/** 좌석 HOLD 응답 (가상 스펙) */
export interface SeatHoldResponse {
  holdId: string;
  seatId: number;
  /** ISO datetime */
  expiresAt: string;
  /** 만료까지 남은 ms (보통 5분 = 300000) */
  holdDurationMs: number;
}

/** SSE 이벤트 페이로드 (가상 스펙) */
export interface SeatUpdateEvent {
  seatId: number;
  status: SeatStatus;
  /** ISO datetime */
  timestamp: string;
}

/** swagger 확정 — 좌석 배치 조회 응답 */
export interface SeatLayoutResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
}
