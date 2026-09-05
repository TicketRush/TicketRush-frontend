// 좌석 API — 백엔드 seat-service (develop, 2026-07-25 소스 확인) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   fetchSeatCounts / fetchSeatLayouts → 이슈 #122 실 API
//   fetchSeatCounts       → GET /api/v1/seat/{performanceId}/seat-counts  (이슈 #121/#122)
//   fetchSeats / fetchSeatLayouts → GET /api/v1/seat/{performanceId}/seat-layouts (이슈 #122)
//   fetchSeatNumbers      → GET /api/v1/seat/numbers?seatIds=1&seatIds=2   (이슈 #122)
//   subscribeSeatStream   → GET /api/v1/seat/{performanceId}/seat-status/stream (이슈 #123 SSE)
//
// ⚠️ 백엔드 응답이 snake_case (total_count 등) 이지만
// instance.ts의 axios-case-converter가 camelCase로 자동 변환.
// 단, EventSource(SSE)는 axios를 거치지 않으므로 이 변환이 적용되지 않는다 (아래 subscribeSeatStream 참고).
//
// ⚠️ seat-service SecurityConfig 확인 결과 전체 anyRequest().permitAll()
// (내부 전용 /api/v1/internal/seat/**만 인증 필요) → 조회/SSE 엔드포인트는 인증 헤더 불필요.
//
// 변경 이력:
// - 2026-07-15 (이슈 #121 fix):
//   - parseSeatNumber → safeParseSeatNumber로 변경 (throw 대신 fallback 반환)
//     seatNumber 형식이 예외적일 때 좌석 배치 전체가 깨지지 않도록 방어
// - 2026-07-25 (이슈 #123):
//   - named `seat-status-changed` + snake_case payload 파싱
//   - onError/onOpen 콜백 (polling fallback 연동)
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
import { USE_MOCK } from "./useMock";

// -------------------------------------------------------
// 백엔드 응답 타입 (원본 스펙)
// -------------------------------------------------------

/** 백엔드 SeatLayoutResponse (좌석 배치 조회 응답) */
interface BackendSeatLayoutResponse {
  seatId: number;
  seatLayoutId: number;
  seatNumber: string;
  seatStatus: SeatStatus;
  /** HOLD 좌석 Kafka delay 만료. 예매 결제 타이머(`expires_at`)와 다름 — 카운트다운에 쓰지 않음 (#167) */
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
 * 공연 좌석 배치 + 상태 조회 (이슈 #122).
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

/** 이슈 #122 네이밍 별칭 — fetchSeats와 동일 (좌석 배치 실 API) */
export const fetchSeatLayouts = fetchSeats;

/**
 * 좌석 ID 배열로 좌석 번호 조회 (이슈 #122).
 * 백엔드: GET /api/v1/seat/numbers?seatIds=1&seatIds=2
 *
 * Spring 반복 파라미터 형식 유지: seatIds=1&seatIds=2
 * (axios 기본 직렬화의 seatIds[]= 형태 방지)
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
    {
      params: { seatIds },
      // indexes: null → seatIds=1&seatIds=2 (repeat)
      paramsSerializer: { indexes: null },
    },
  );
  return res.data ?? [];
}

// -------------------------------------------------------
// Public API — SSE 좌석 상태 스트림 (이슈 #123)
// -------------------------------------------------------

/** 백엔드 SeatStatusChangedResponse의 실제 SSE 원본 payload (snake_case, Jackson NON_NULL) */
interface BackendSeatStatusChangedEventRaw {
  performance_id: number;
  seat_id: number;
  seat_layout_id: number;
  seat_number: string;
  seat_status: SeatStatus;
  /** HOLD가 아니면 필드 자체가 없을 수 있음 (NON_NULL) */
  hold_expired_at?: string;
}

function parseSeatUpdateEvent(raw: string): SeatUpdateEvent | null {
  try {
    const parsed = JSON.parse(raw) as Partial<BackendSeatStatusChangedEventRaw>;
    if (typeof parsed.seat_id !== "number" || !parsed.seat_status) {
      return null;
    }
    return {
      seatId: parsed.seat_id,
      status: parsed.seat_status,
      performanceId: parsed.performance_id,
      seatLayoutId: parsed.seat_layout_id,
      seatNumber: parsed.seat_number,
      holdExpiredAt: parsed.hold_expired_at,
    };
  } catch (error) {
    console.error("[SSE] 이벤트 파싱 실패:", error, raw);
    return null;
  }
}

export interface SubscribeSeatStreamCallbacks {
  /** SSE 연결 오류/단절 시 (polling fallback 트리거용) */
  onError?: (error: Event) => void;
  /** SSE 연결(최초 연결 or 재연결) 성공 시 (polling 중지용) */
  onOpen?: () => void;
}

/**
 * 좌석 상태 SSE 구독 (이슈 #123).
 * 백엔드: GET /api/v1/seat/{performanceId}/seat-status/stream
 *
 * 이벤트:
 *   - named `seat-status-changed` (주 경로, 백엔드 SeatStatusSseEventSender 확인)
 *   - named `connected` (연결 시 1회, plain string "connected" — JSON 아님, 무시)
 *   - unnamed onmessage (백엔드가 event 없이 보낼 가능성 대비 fallback)
 *
 * ⚠️ payload는 백엔드 전역 Jackson SNAKE_CASE 설정 그대로 온다
 * (EventSource는 axios-case-converter를 거치지 않음). parseSeatUpdateEvent에서 변환.
 *
 * ⚠️ seat-service는 anyRequest().permitAll() → 인증 헤더 불필요.
 * withCredentials는 실질적 효과 없지만 향후 쿠키 인증 도입 대비 유지.
 *
 * @returns 구독 해제 함수 (unsubscribe) — unmount 시 EventSource.close()
 */
export function subscribeSeatStream(
  performanceId: number,
  onEvent: (event: SeatUpdateEvent) => void,
  callbacks?: SubscribeSeatStreamCallbacks,
): () => void {
  if (USE_MOCK) {
    // Mock은 연결이 항상 성공한 것으로 취급 (polling fallback 트리거 없음)
    callbacks?.onOpen?.();
    return mockSubscribeSeats(performanceId, onEvent);
  }

  // ⚠️ EventSource는 브라우저 표준 API. 인증 헤더 미지원 (쿠키만 자동 포함).
  // 백엔드가 JWT 헤더 인증을 요구한다면 EventSourcePolyfill 등 라이브러리 필요.
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const url = `${baseUrl}/api/v1/seat/${performanceId}/seat-status/stream`;

  const eventSource = new EventSource(url, { withCredentials: true });

  const handleMessage = (message: MessageEvent<string>) => {
    const event = parseSeatUpdateEvent(message.data);
    if (event) onEvent(event);
  };

  // 주 경로: named SSE event (백엔드 EVENT_NAME = "seat-status-changed")
  eventSource.addEventListener("seat-status-changed", handleMessage);
  // fallback: event 이름 없는 기본 message
  eventSource.onmessage = handleMessage;

  eventSource.addEventListener("open", () => {
    callbacks?.onOpen?.();
  });

  eventSource.onerror = (error) => {
    console.error("[SSE] 연결 오류:", error);
    callbacks?.onError?.(error);
    // EventSource는 자동 재연결 시도. 재연결 성공 시 open 이벤트 → onOpen에서 polling 중지.
  };

  return () => {
    eventSource.removeEventListener("seat-status-changed", handleMessage);
    eventSource.close();
  };
}

// -------------------------------------------------------
// Deprecated stubs — 백엔드 seat-service에 HOLD/RELEASE API 없음
// (#121 CI: useHoldSeat/useReleaseSeat가 아직 import하므로 stub 유지)
// 실 연동은 #124에서 createBooking / cancelBooking으로 대체.
// -------------------------------------------------------

/**
 * @deprecated 백엔드에 좌석 HOLD API 없음. POST /api/v1/booking 사용 (#124).
 * Mock에서만 캐시 갱신용으로 seatId를 반환한다.
 */
export async function holdSeat(
  _performanceId: number,
  seatId: number,
): Promise<{ seatId: number }> {
  if (USE_MOCK) {
    await mockDelay(300);
    return { seatId };
  }
  throw new Error(
    "holdSeat is not supported by backend. Use POST /api/v1/booking (#124).",
  );
}

/**
 * @deprecated 백엔드에 좌석 RELEASE API 없음. DELETE /api/v1/booking/{bookingNumber} 사용 (#124).
 */
export async function releaseSeat(
  _performanceId: number,
  _seatId: number,
): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(200);
    return;
  }
  throw new Error(
    "releaseSeat is not supported by backend. Use DELETE /api/v1/booking/{bookingNumber} (#124).",
  );
}
