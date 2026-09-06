// Mock 좌석 — 메모리 상태 + SSE 시뮬레이터
//
// 백엔드 seat-service swagger (2026-06-30) 스펙 반영.
//
// 주요 변경:
//   - Seat.seatNumber → seatNumber (백엔드 필드명)
//   - Seat.seatLayoutId → seatLayoutId
//   - Seat 제거 (백엔드 스펙엔 좌석 단위 가격 없음. 공연 단위 가격만 사용)
//   - SeatAvailability → SeatCounts로 이름 변경 + 확장 (holdCount, soldCount 추가)
//   - SeatHoldResponse 관련 mock 유지 (실 API 연동 시 예매 생성으로 대체 예정)
//
// ⚠️ 실 API 매핑 계획:
//   mockGetSeats      → GET  /api/v1/seat/{performanceId}/seat-layouts + 상태 동기화
//   mockGetSeatCounts → GET  /api/v1/seat/{performanceId}/seat-counts
//   mockHoldSeat      → POST /api/v1/booking (예매 생성이 좌석 HOLD를 겸함)
//   mockReleaseSeat   → PATCH /api/v1/booking/{bookingId}/cancel
//   mockConfirmSold   → 백엔드 내부 자동 처리 (POST /payment/confirm 성공 시)
//   mockSubscribeSeats → GET /api/v1/seat/{performanceId}/seat-status/stream (SSE)
//
// - 2026-08-06 (이슈 #177):
//   - availableCount를 MOCK_CONCERTS.remainingSeats에 맞춰 시드
//     (ON_SALE 매진 = remainingSeats 0 → availableCount 0 고정)

import { mockDelay, mockError, shouldThrow } from "./_helpers";
import { MOCK_CONCERTS } from "./concerts";
import useSeatStore from "@/stores/reservation/seatStore";
import type {
  SeatWithStatus,
  SeatCounts,
  SeatStatus,
  SeatUpdateEvent,
} from "@/types/domain/seat";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const COLS = 12;
const HOLD_DURATION_MS = 5 * 60 * 1000;
const TOTAL_SEATS = ROWS.length * COLS;

/**
 * mockHoldSeat 반환 타입 (백엔드에 실제 API 없음, mock 편의용).
 * 실 API 연동 시 사용 안 함.
 */
interface MockHoldResult {
  holdId: string;
  seatId: number;
  expiresAt: string;
  holdDurationMs: number;
}

// 공연별 좌석 상태 캐시 (메모리)
const seatStateByPerformance: Map<number, Map<number, SeatStatus>> = new Map();

function ensureSeatState(performanceId: number) {
  if (seatStateByPerformance.has(performanceId)) return;

  const concert = MOCK_CONCERTS.find((c) => c.id === performanceId);
  const availableTarget = Math.max(
    0,
    Math.min(TOTAL_SEATS, concert?.remainingSeats ?? Math.floor(TOTAL_SEATS * 0.6)),
  );

  // remainingSeats만큼 AVAILABLE, 나머지는 SOLD(일부 HOLD)로 고정 시드
  // → #177 매진(id=2, remainingSeats=0) 등 시나리오를 재현 가능하게 함
  const map = new Map<number, SeatStatus>();
  for (let seatId = 1; seatId <= TOTAL_SEATS; seatId++) {
    if (seatId <= availableTarget) {
      map.set(seatId, "AVAILABLE");
    } else if ((seatId - availableTarget) % 8 === 0) {
      map.set(seatId, "HOLD");
    } else {
      map.set(seatId, "SOLD");
    }
  }
  seatStateByPerformance.set(performanceId, map);
}

export async function mockGetSeats(
  performanceId: number,
): Promise<SeatWithStatus[]> {
  await mockDelay(400);
  ensureSeatState(performanceId);

  const statusMap = seatStateByPerformance.get(performanceId)!;
  const seats: SeatWithStatus[] = [];
  let seatId = 1;
  ROWS.forEach((row) => {
    for (let col = 1; col <= COLS; col++) {
      seats.push({
        id: seatId,
        seatLayoutId: seatId,
        seatNumber: `${row}-${col}`,
        // 파생 필드 (프론트 편의)
        row,
        col,
        status: statusMap.get(seatId)!,
      });
      seatId++;
    }
  });

  return seats;
}

export async function mockGetSeatCounts(
  performanceId: number,
): Promise<SeatCounts> {
  await mockDelay(200);
  ensureSeatState(performanceId);

  const statusMap = seatStateByPerformance.get(performanceId)!;
  let available = 0;
  let hold = 0;
  let sold = 0;
  statusMap.forEach((status) => {
    if (status === "AVAILABLE") available++;
    else if (status === "HOLD") hold++;
    else if (status === "SOLD") sold++;
  });

  return {
    totalCount: statusMap.size,
    availableCount: available,
    holdCount: hold,
    soldCount: sold,
  };
}

/** PENDING 예매 생성 시 좌석 HOLD (랜덤 충돌 없음) */
export function applyMockSeatHold(performanceId: number, seatId: number) {
  ensureSeatState(performanceId);
  const statusMap = seatStateByPerformance.get(performanceId)!;
  statusMap.set(seatId, "HOLD");
  notifyListeners(performanceId, {
    seatId,
    status: "HOLD",
    timestamp: new Date().toISOString(),
  });
}

export async function mockHoldSeat(
  performanceId: number,
  seatId: number,
): Promise<MockHoldResult> {
  await mockDelay(300);
  ensureSeatState(performanceId);

  const statusMap = seatStateByPerformance.get(performanceId)!;
  const current = statusMap.get(seatId);

  // 5% 확률로 동시 선점 충돌 시뮬레이션
  if (current === "HOLD" || shouldThrow(0.05)) {
    await mockError(
      "SEAT_ALREADY_HELD",
      "이미 다른 사용자가 선점한 좌석입니다.",
      100,
    );
  }
  if (current === "SOLD") {
    await mockError("SEAT_ALREADY_SOLD", "이미 판매된 좌석입니다.", 100);
  }

  statusMap.set(seatId, "HOLD");
  notifyListeners(performanceId, {
    seatId,
    status: "HOLD",
    timestamp: new Date().toISOString(),
  });

  return {
    holdId: `hold-${seatId}-${Date.now()}`,
    seatId,
    expiresAt: new Date(Date.now() + HOLD_DURATION_MS).toISOString(),
    holdDurationMs: HOLD_DURATION_MS,
  };
}

export async function mockReleaseSeat(
  performanceId: number,
  seatId: number,
): Promise<void> {
  await mockDelay(200);
  ensureSeatState(performanceId);

  const statusMap = seatStateByPerformance.get(performanceId)!;
  if (statusMap.get(seatId) === "HOLD") {
    statusMap.set(seatId, "AVAILABLE");
    notifyListeners(performanceId, {
      seatId,
      status: "AVAILABLE",
      timestamp: new Date().toISOString(),
    });
  }
}

export async function mockConfirmSold(
  performanceId: number,
  seatId: number,
): Promise<void> {
  await mockDelay(300);
  ensureSeatState(performanceId);

  const statusMap = seatStateByPerformance.get(performanceId)!;
  statusMap.set(seatId, "SOLD");
  notifyListeners(performanceId, {
    seatId,
    status: "SOLD",
    timestamp: new Date().toISOString(),
  });
}

// ── SSE 시뮬레이터 ─────────────────────────────────────
type Listener = (event: SeatUpdateEvent) => void;
const listeners: Map<number, Set<Listener>> = new Map();
const intervalByPerformance: Map<
  number,
  ReturnType<typeof setInterval>
> = new Map();

function notifyListeners(performanceId: number, event: SeatUpdateEvent) {
  listeners.get(performanceId)?.forEach((l) => l(event));
}

/**
 * mock QA 임시 스위치.
 * URL에 `?forceHoldSelected=1` 이면 랜덤이 아니라 **현재 선택 좌석**을 HOLD한다.
 * 예: /concerts/1/seats?forceHoldSelected=1
 */
function isForceHoldSelectedEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get("forceHoldSelected") ===
    "1"
  );
}

function holdSeatForSimulator(
  performanceId: number,
  seatId: number,
  statusMap: Map<number, SeatStatus>,
) {
  statusMap.set(seatId, "HOLD");
  notifyListeners(performanceId, {
    seatId,
    status: "HOLD",
    timestamp: new Date().toISOString(),
  });

  // 5초 후 다시 해제 (반복 테스트 가능)
  setTimeout(() => {
    if (statusMap.get(seatId) === "HOLD") {
      statusMap.set(seatId, "AVAILABLE");
      notifyListeners(performanceId, {
        seatId,
        status: "AVAILABLE",
        timestamp: new Date().toISOString(),
      });
    }
  }, 5000);
}

/**
 * 다른 사용자의 좌석 활동을 시뮬레이션.
 * - 기본: 3초마다 10% 확률로 랜덤 좌석 HOLD → 5초 후 AVAILABLE
 * - `?forceHoldSelected=1`: 선택 좌석이 있으면 약 2초마다 그 좌석을 HOLD (토스트/선택 해제 QA용)
 */
function startSimulator(performanceId: number) {
  if (intervalByPerformance.has(performanceId)) return;

  const interval = setInterval(() => {
    ensureSeatState(performanceId);
    const statusMap = seatStateByPerformance.get(performanceId)!;

    // ── QA 스위치: 선택 좌석 강제 HOLD ──
    if (isForceHoldSelectedEnabled()) {
      const selectedId = useSeatStore.getState().selectedSeat?.id;
      if (
        selectedId != null &&
        statusMap.get(selectedId) === "AVAILABLE"
      ) {
        holdSeatForSimulator(performanceId, selectedId, statusMap);
      }
      return;
    }

    // ── 기본 랜덤 시뮬레이터 ──
    if (Math.random() >= 0.1) return;

    const seatIds = Array.from(statusMap.keys());
    const randomId = seatIds[Math.floor(Math.random() * seatIds.length)];
    const current = statusMap.get(randomId)!;

    if (current === "AVAILABLE") {
      holdSeatForSimulator(performanceId, randomId, statusMap);
    }
  }, 3000);

  intervalByPerformance.set(performanceId, interval);
}

function stopSimulatorIfNoListeners(performanceId: number) {
  const count = listeners.get(performanceId)?.size ?? 0;
  if (count === 0) {
    const interval = intervalByPerformance.get(performanceId);
    if (interval) {
      clearInterval(interval);
      intervalByPerformance.delete(performanceId);
    }
  }
}

export function mockSubscribeSeats(
  performanceId: number,
  onEvent: Listener,
): () => void {
  if (!listeners.has(performanceId)) listeners.set(performanceId, new Set());
  listeners.get(performanceId)!.add(onEvent);

  startSimulator(performanceId);

  return () => {
    listeners.get(performanceId)?.delete(onEvent);
    stopSimulatorIfNoListeners(performanceId);
  };
}
