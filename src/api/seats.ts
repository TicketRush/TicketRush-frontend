// 좌석 API — 백엔드 seat-service swagger (2026-07-07) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   fetchSeatCounts       → GET /api/v1/seat/{performanceId}/seat-counts
//   fetchSeats            → GET /api/v1/seat/{performanceId}/seat-layouts
//   fetchSeatNumbers      → GET /api/v1/seat/numbers
//   subscribeSeatStream   → GET /api/v1/seat/{performanceId}/seat-status/stream (SSE)
//
// ⚠️ 백엔드 응답이 snake_case (total_count 등) 이지만
// instance.ts의 axios-case-converter가 camelCase로 자동 변환.
//
// 변경 이력:
// - 2026-07-15 (이슈 #121 fix):
//   - parseSeatNumber → safeParseSeatNumber로 변경 (throw 대신 fallback 반환)
//     seatNumber 형식이 예외적일 때 좌석 배치 전체가 깨지지 않도록 방어
import type {
  SeatCounts,
  SeatStatus,
  SeatUpdateEvent,
  SeatWithStatus,
} from "@/types/domain/seat";
import {
  mockGetSeats,
  mockGetSeatCounts,
  mockSubscribeSeats,
} from "./mocks/seats";
import { mockDelay } from "./mocks/_helpers";
import { safeParseSeatNumber } from "@/utils/seat/parseSeatNumber";
import apiClient from "./instance";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// -------------------------------------------------------
// 백엔드 응답 타입 (원본 스펙)
// -------------------------------------------------------

/** 백엔드 SeatLayoutResponse (좌석 배치 조회 응답) */
interface BackendSeatLayoutResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  /** HOLD 상태의 만료 예정 시각 (그 외 상태에서는 null 가능) */
  holdExpiredAt?: string;
}

/** 백엔드 SeatNumberResponse (좌석 번호 조회 응답) */
interface BackendSeatNumberResponse {
  seatId: number;
  seatNumber: string;
}

// -------------------------------------------------------
// 매핑 함수
// -------------------------------------------------------

/**
 * 백엔드 SeatLayoutResponse → 프론트 SeatWithStatus.
 * seatNumber "A-1"에서 row("A"), col(1) 파생.
 *
 * safeParseSeatNumber 사용: 파싱 실패 시 { row: "?", col: 0 } fallback.
 * (전체 좌석맵이 깨지지 않도록 방어)
 */
function mapSeatLayout(item: BackendSeatLayoutResponse): SeatWithStatus {
  const parsed = safeParseSeatNumber(item.seatNumber);
  return {
    id: item.seatId,
    seatLayoutId: item.seatLayoutId,
    seatNumber: item.seatNumber,
    row: parsed.row,
    col: parsed.col,
    status: item.seatStatus,
  };
}

// -------------------------------------------------------
// Public API — 좌석 카운트 (이슈 #121)
// -------------------------------------------------------

/**
 * 공연 좌석 상태별 카운트 조회.
 * 백엔드: GET /api/v1/seat/{performanceId}/seat-counts
 *
 * 반환값: { totalCount, availableCount, soldCount, holdCount }
 *
 * 매진 판단 (프론트 로직):
 *   availableCount === 0 → 매진
 */
export async function fetchSeatCounts(
  performanceId: number,
): Promise<SeatCounts> {
  if (USE_MOCK) {
    return mockGetSeatCounts(performanceId);
  }

  const res = await apiClient.get<SeatCounts>(
    `/api/v1/seat/${performanceId}/seat-counts`,
  );
  return res.data;
}

// -------------------------------------------------------
// Public API — 좌석 배치 + 상태 (이슈 #122)
// -------------------------------------------------------

/**
 * 공연 좌석 배치 + 상태 조회.
 * 백엔드: GET /api/v1/seat/{performanceId}/seat-layouts
 *
 * 응답: SeatLayoutResponse[]
 *   → 프론트에서는 seatNumber에서 row, col 파생 후 SeatWithStatus[] 반환
 *
 * ⚠️ staleTime: 0 권장 (실시간 좌석 상태).
 * SSE와 병행 사용 시 이벤트 발생마다 캐시 patch.
 */
export async function fetchSeats(
  performanceId: number,
): Promise<SeatWithStatus[]> {
  if (USE_MOCK) {
    return mockGetSeats(performanceId);
  }

  const res = await apiClient.get<BackendSeatLayoutResponse[]>(
    `/api/v1/seat/${performanceId}/seat-layouts`,
  );
  return (res.data ?? []).map(mapSeatLayout);
}

/**
 * 좌석 ID 배열로 좌석 번호 조회.
 * 백엔드: GET /api/v1/seat/numbers?seatIds=1&seatIds=2
 *
 * 사용처: 예매 목록 페이지에서 seatId만 있는 예매 항목의 좌석 번호 조회 등.
 */
export async function fetchSeatNumbers(
  seatIds: number[],
): Promise<{ seatId: number; seatNumber: string }[]> {
  if (seatIds.length === 0) return [];

  if (USE_MOCK) {
    await mockDelay(200);
    // Mock: 간단히 "A-1", "A-2" 형식으로 생성
    return seatIds.map((id) => ({
      seatId: id,
      seatNumber: `A-${id}`,
    }));
  }

  const res = await apiClient.get<BackendSeatNumberResponse[]>(
    "/api/v1/seat/numbers",
    { params: { seatIds } },
  );
  return res.data ?? [];
}

// -------------------------------------------------------
// Public API — SSE 좌석 상태 스트림 (이슈 #123)
// -------------------------------------------------------

/**
 * 좌석 상태 SSE 구독.
 * 백엔드: GET /api/v1/seat/{performanceId}/seat-status/stream
 *
 * ⚠️ SSE 이벤트 payload 스펙 백엔드 확정 대기 (현재 가정 스펙):
 *   {
 *     "seatId": 1,
 *     "status": "AVAILABLE" | "HOLD" | "SOLD",
 *     "timestamp": "2026-07-15T10:00:00Z"
 *   }
 *
 * 실 API 시 EventSource 사용. 인증 헤더 필요할 경우 EventSourcePolyfill 등 검토.
 *
 * @returns 구독 해제 함수 (unsubscribe)
 */
export function subscribeSeatStream(
  performanceId: number,
  onEvent: (event: SeatUpdateEvent) => void,
): () => void {
  if (USE_MOCK) {
    return mockSubscribeSeats(performanceId, onEvent);
  }

  // ⚠️ EventSource는 브라우저 표준 API. 인증 헤더 미지원 (쿠키만 자동 포함).
  // 백엔드가 JWT 헤더 인증을 요구한다면 EventSourcePolyfill 등 라이브러리 필요.
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const url = `${baseUrl}/api/v1/seat/${performanceId}/seat-status/stream`;

  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data);
      onEvent({
        seatId: parsed.seatId,
        status: parsed.status ?? parsed.seatStatus,
        timestamp: parsed.timestamp ?? new Date().toISOString(),
      });
    } catch (error) {
      console.error("[SSE] 이벤트 파싱 실패:", error, message.data);
    }
  };

  eventSource.onerror = (error) => {
    console.error("[SSE] 연결 오류:", error);
  };

  return () => {
    eventSource.close();
  };
}
