// 예매 도메인 타입
//
// 백엔드 booking-service swagger (2026-06-30) 스펙 반영
//
// 주요 변경:
//   - BookingCreateRequest → BookingPendingRequest로 리네임 (백엔드 이름 일치)
//   - userId 필드 삭제 (백엔드가 JWT 토큰에서 추출)
//   - BookingSummary(내 예매) 신규 추가 — 백엔드가 최소 정보만 반환
//   - BookingDetail은 그대로 유지 — 프론트에서 aggregation 필요
//     (⚠️ 백엔드에 aggregation API 추가 요청 검토 필요)

export type BookingStatus =
  | "PENDING" // 결제 대기 (좌석 자동 HOLD 중)
  | "CONFIRMED" // 결제 완료
  | "CANCELLED" // 취소됨
  | "EXPIRED"; // 타이머 만료

// ── 예매 생성 (백엔드 확정) ──────────────────────────
/**
 * 백엔드 BookingPendingRequest 대응.
 *
 * 백엔드 필드는 snake_case (performance_id, seat_id)지만
 * axios-case-converter가 자동으로 프론트의 camelCase를 변환하여 전송.
 *
 * userId는 백엔드가 JWT 토큰에서 추출하므로 프론트에서 전송하지 않음.
 */
export interface BookingPendingRequest {
  performanceId: number;
  seatId: number;
}

/** 백엔드 BookingPendingResponse 대응 */
export interface BookingPendingResponse {
  bookingId: number;
  /** 사용자에게 노출되는 예매번호 (예: "X7B29-KLPW1") */
  bookingNumber: string;
  status: BookingStatus;
}

// ── 내 예매 목록 (백엔드 확정, 최소 정보만) ─────────
/**
 * 백엔드 GET /api/v1/booking/me 응답 항목.
 *
 * ⚠️ 백엔드가 공연/좌석 정보를 함께 주지 않음. 프론트에서 다음 중 하나로 대응:
 *   - 예매마다 GET /performance/{performanceId} 별도 호출 (N+1 문제)
 *   - GET /seat/{performanceId}/seat-layouts 별도 호출로 seatNumber 획득
 *   - 또는 백엔드에 aggregation API 요청
 */
export interface BookingSummary {
  bookingId: number;
  bookingNumber: string;
  performanceId: number;
  seatId: number;
  status: BookingStatus;
  /** ISO datetime — 결제 완료 시각 (PENDING은 null) */
  confirmedAt: string | null;
  /** ISO datetime — 예매 생성 시각 */
  createdAt: string;
}

// ── 예매 상세 (프론트 aggregation) ───────────────────
/**
 * 프론트에서 aggregation한 예매 상세.
 *
 * 백엔드 응답 자체는 BookingSummary이지만,
 * TicketDetailPage/PaymentCompletePage에서 공연/좌석 정보가 필요하므로
 * 다음을 조합하여 구성:
 *   - BookingSummary (booking-service)
 *   - PerformanceDetail (performance-service)
 *   - SeatLayoutResponse.seatNumber (seat-service)
 */
export interface BookingDetail {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;

  // 공연 정보 (performance-service 조회)
  performanceId: number;
  performanceTitle: string;
  performancePerformer: string; // 기존 performanceArtist에서 변경
  performanceVenue: string;
  performanceDate: string;
  performanceTime: string;
  performanceImageMainUrl: string; // 기존 performancePosterUrl에서 변경

  // 좌석 정보 (seat-service 조회)
  seatId: number;
  seatNumber: string; // 기존 seatLabel에서 변경

  // 결제 정보
  price: number;
  paidAt: string | null;

  createdAt: string;
  cancelledAt: string | null;
}

// ── 마이페이지 표시용 항목 (프론트 aggregation) ─────
export type BookingTab = "upcoming" | "past";

/**
 * 마이페이지 카드에 표시할 정보.
 * BookingSummary + 공연 정보 aggregation 결과.
 */
export interface BookingListItem {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;
  performanceTitle: string;
  performanceVenue: string;
  performanceDate: string;
  performanceTime: string;
  performanceImageMainUrl: string;
  seatNumber: string;
  price: number;
  createdAt: string;
}

export interface MyBookingsParams {
  /** 한 번에 가져올 최대 개수 (전체 조회용 — 예매 내역은 수백 건 이하) */
  size?: number;
}

export interface MyBookingsResponse {
  items: BookingListItem[];
  /** 전체 조회 기준 더 받을 데이터가 있는지 (보통 false) */
  hasNext: boolean;
}

/** 내 예매 수 응답 — 백엔드 GET /booking/me/count 대응 */
export interface MyBookingCountResponse {
  count: number;
}
