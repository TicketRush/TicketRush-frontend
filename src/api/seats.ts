// 좌석 API — 백엔드 seat-service swagger (2026-06-30) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   fetchSeats           → GET /api/v1/seat/{performanceId}/seat-layouts
//   fetchSeatCounts      → GET /api/v1/seat/{performanceId}/seat-counts
//   holdSeat             → 실 API 없음. 실 연동 시 POST /api/v1/booking으로 대체 (이슈 #B-8)
//   releaseSeat          → 실 API 없음. 실 연동 시 DELETE /api/v1/booking/{number}로 대체
//   subscribeSeatStream  → GET /api/v1/seat/{performanceId}/seat-status/stream (SSE)

import type {
  SeatWithStatus,
  SeatCounts,
  SeatUpdateEvent,
} from "@/types/domain/seat";
import {
  mockGetSeats,
  mockGetSeatCounts,
  mockHoldSeat,
  mockReleaseSeat,
  mockSubscribeSeats,
} from "./mocks/seats";
// import apiClient from "./instance";

const USE_MOCK = true;

/**
 * mock 전용 HOLD 응답 타입.
 *
 * ⚠️ 백엔드 실 API 없음.
 * 실 API 연동 시 이 함수는 예매 생성(POST /booking)으로 대체되므로 사용 안 함.
 * `types/domain/seat.ts`가 아닌 여기 로컬로 정의한 이유: 백엔드 도메인 타입에 없는 개념.
 */
export interface SeatHoldResponse {
  holdId: string;
  seatId: number;
  expiresAt: string;
  holdDurationMs: number;
}

/** 좌석 + 상태 통합 조회 */
export async function fetchSeats(
  performanceId: number,
): Promise<SeatWithStatus[]> {
  if (USE_MOCK) return mockGetSeats(performanceId);
  // const res = await apiClient.get<SeatWithStatus[]>(
  //   `/api/v1/seat/${performanceId}/seat-layouts`,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 좌석 상태별 카운트 (백엔드 확정) */
export async function fetchSeatCounts(
  performanceId: number,
): Promise<SeatCounts> {
  if (USE_MOCK) return mockGetSeatCounts(performanceId);
  // const res = await apiClient.get<SeatCounts>(
  //   `/api/v1/seat/${performanceId}/seat-counts`,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 좌석 선점 (mock 전용) */
export async function holdSeat(
  performanceId: number,
  seatId: number,
): Promise<SeatHoldResponse> {
  if (USE_MOCK) return mockHoldSeat(performanceId, seatId);
  // 실 API 연동 시 이 함수는 사용 안 함 (POST /booking으로 대체)
  throw new Error("Real API not implemented (use createBookingApi instead)");
}

/** 좌석 선점 해제 (mock 전용) */
export async function releaseSeat(
  performanceId: number,
  seatId: number,
): Promise<void> {
  if (USE_MOCK) return mockReleaseSeat(performanceId, seatId);
  // 실 API 연동 시 이 함수는 사용 안 함 (DELETE /booking으로 대체)
  throw new Error("Real API not implemented (use cancelBookingApi instead)");
}

/**
 * 좌석 상태 SSE 구독.
 * 반환값: 구독 해제 함수
 */
export function subscribeSeatStream(
  performanceId: number,
  onEvent: (event: SeatUpdateEvent) => void,
  onError?: (error: Error) => void,
): () => void {
  if (USE_MOCK) {
    return mockSubscribeSeats(performanceId, onEvent);
  }

  // 실 SSE 구현 (백엔드 endpoint 확정)
  // const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  // const url = `${baseURL}/api/v1/seat/${performanceId}/seat-status/stream`;
  // const es = new EventSource(url, { withCredentials: true });
  // es.addEventListener("seat-update", (e: MessageEvent) => {
  //   try {
  //     onEvent(JSON.parse(e.data));
  //   } catch (err) {
  //     onError?.(err as Error);
  //   }
  // });
  // es.onerror = () => onError?.(new Error("SSE connection error"));
  // return () => es.close();
  void onError;
  throw new Error("SSE not implemented");
}
