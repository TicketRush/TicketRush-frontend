// 좌석 API
// swagger 확정: GET seat-layouts, GET seat-counts (단, layouts에 상태가 없어서 가상 통합 API 사용)
// 가상 스펙: 통합 좌석 조회, HOLD/RELEASE, SSE

import type {
  SeatWithStatus,
  SeatAvailability,
  SeatHoldResponse,
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

/** 좌석 + 상태 통합 조회 (가상) */
export async function fetchSeats(
  performanceId: number,
): Promise<SeatWithStatus[]> {
  if (USE_MOCK) return mockGetSeats(performanceId);
  // const res = await apiClient.get<SeatWithStatus[]>(
  //   `/api/v1/seat/${performanceId}/seats`,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 좌석 잔여 수 (swagger 확정) */
export async function fetchSeatCounts(
  performanceId: number,
): Promise<SeatAvailability> {
  if (USE_MOCK) return mockGetSeatCounts(performanceId);
  // const res = await apiClient.get<SeatAvailability>(
  //   `/api/v1/seat/${performanceId}/seat-counts`,
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 좌석 선점 (가상) */
export async function holdSeat(
  performanceId: number,
  seatId: number,
): Promise<SeatHoldResponse> {
  if (USE_MOCK) return mockHoldSeat(performanceId, seatId);
  // const res = await apiClient.post<SeatHoldResponse>(
  //   `/api/v1/seat/${performanceId}/hold`,
  //   { seatId },
  // );
  // return res.data;
  throw new Error("Real API not implemented");
}

/** 좌석 선점 해제 (가상) */
export async function releaseSeat(
  performanceId: number,
  seatId: number,
): Promise<void> {
  if (USE_MOCK) return mockReleaseSeat(performanceId, seatId);
  // await apiClient.delete(`/api/v1/seat/hold/${seatId}`);
  throw new Error("Real API not implemented");
}

/**
 * 좌석 상태 SSE 구독 (가상)
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

  // 실 SSE 구현 (가상 엔드포인트)
  // const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  // const url = `${baseURL}/api/v1/seat/${performanceId}/stream`;
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
