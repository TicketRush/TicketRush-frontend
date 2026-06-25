// Mock 좌석 — 메모리 상태 + SSE 시뮬레이터
import { mockDelay, mockError, shouldThrow } from "./_helpers";
import type {
  SeatWithStatus,
  SeatAvailability,
  SeatHoldResponse,
  SeatStatus,
  SeatUpdateEvent,
} from "@/types/domain/seat";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const COLS = 12;
const HOLD_DURATION_MS = 5 * 60 * 1000;

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
  ROWS.forEach((row, rowIdx) => {
    for (let col = 1; col <= COLS; col++) {
      seats.push({
        id: seatId,
        layoutId: seatId,
        row,
        col,
        label: `${row}-${col}`,
        // 앞열일수록 비쌈
        price: 50000 + rowIdx * 10000,
        status: statusMap.get(seatId)!,
      });
      seatId++;
    }
  });

  return seats;
}

export async function mockGetSeatCounts(
  performanceId: number,
): Promise<SeatAvailability> {
  await mockDelay(200);
  ensureSeatState(performanceId);

  const statusMap = seatStateByPerformance.get(performanceId)!;
  let available = 0;
  statusMap.forEach((status) => {
    if (status === "AVAILABLE") available++;
  });

  return { availableCount: available, totalCount: statusMap.size };
}

export async function mockHoldSeat(
  performanceId: number,
  seatId: number,
): Promise<SeatHoldResponse> {
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
    await mockError(
      "SEAT_ALREADY_SOLD",
      "이미 판매된 좌석입니다.",
      100,
    );
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
