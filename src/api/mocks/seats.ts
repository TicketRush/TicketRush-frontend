// Mock 좌석 — 메모리 상태 + SSE 시뮬레이터
//
// 백엔드 seat-service swagger (2026-06-30) 스펙 반영.
//
// 주요 변경:
//   - Seat.label → seatNumber (백엔드 필드명)
//   - Seat.layoutId → seatLayoutId
//   - Seat.price 제거 (백엔드 스펙엔 좌석 단위 가격 없음. 공연 단위 가격만 사용)
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

import { mockDelay, mockError, shouldThrow } from "./_helpers";
import type {
  SeatWithStatus,
  SeatCounts,
  SeatStatus,
  SeatUpdateEvent,
} from "@/types/domain/seat";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const COLS = 12;
const HOLD_DURATION_MS = 5 * 60 * 1000;

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

  const map = new Map<number, SeatStatus>();
  let seatId = 1;
  ROWS.forEach(() => {
    for (let col = 1; col <= COLS; col++) {
      const r = Math.random();
      let status: SeatStatus = "AVAILABLE";
      if (r < 0.15) status = "HOLD";
      else if (r < 0.25) status = "SOLD";
      map.set(seatId++, status);
    }
  });
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
const intervalByPerformance: Map<number, NodeJS.Timeout> = new Map();

function notifyListeners(performanceId: number, event: SeatUpdateEvent) {
  listeners.get(performanceId)?.forEach((l) => l(event));
}

/**
 * 다른 사용자의 좌석 활동을 시뮬레이션.
 * 3초마다 10% 확률로 랜덤한 좌석을 HOLD → 5초 후 AVAILABLE.
 * UI에서 SSE 동작을 눈으로 확인하기 위함.
 */
function startSimulator(performanceId: number) {
  if (intervalByPerformance.has(performanceId)) return;

  const interval = setInterval(() => {
    if (Math.random() >= 0.1) return;

    ensureSeatState(performanceId);
    const statusMap = seatStateByPerformance.get(performanceId)!;
    const seatIds = Array.from(statusMap.keys());
    const randomId = seatIds[Math.floor(Math.random() * seatIds.length)];
    const current = statusMap.get(randomId)!;

    if (current === "AVAILABLE" && Math.random() < 0.5) {
      statusMap.set(randomId, "HOLD");
      notifyListeners(performanceId, {
        seatId: randomId,
        status: "HOLD",
        timestamp: new Date().toISOString(),
      });

      // 5초 후 다시 해제
      setTimeout(() => {
        if (statusMap.get(randomId) === "HOLD") {
          statusMap.set(randomId, "AVAILABLE");
          notifyListeners(performanceId, {
            seatId: randomId,
            status: "AVAILABLE",
            timestamp: new Date().toISOString(),
          });
        }
      }, 5000);
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
