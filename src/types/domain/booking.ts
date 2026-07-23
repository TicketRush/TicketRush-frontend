// 예매 도메인 타입
//
// 백엔드 booking-service swagger (2026-07-07) 스펙 반영
//
// 변경 이력:
//- 2026-06-30 (초기):
// - BookingCreateRequest → BookingPendingRequest 리네임
// - userId 필드 삭제 (백엔드가 JWT 토큰에서 추출)
// - BookingSummary(내 예매) 신규 추가
//- 2026-07-15 (이슈 #124):
// - BookingStatus enum 백엔드 스펙 정확히 반영:
//   * "CANCELLED" (L 두개) → "CANCELED" (L 하나) 스펠링 정정
//   * REFUNDING, REFUNDED 추가 (환불 flow)
// - BookingSummary 백엔드 응답 매핑 명시:
//   * bookingStatus(백엔드) ↔ status(프론트) — api 함수에서 매핑
//   * createdAt 필드는 백엔드에 없음 → 프론트 도메인에서 optional 처리
//
// ⚠️ 2026-07-18 swagger-ui 실측: REFUND_FAILED는 실제 enum 값이 아님 (제거).
// "환불 실패" 판단은 대신 booking-service의 별도 관리자 엔드포인트
// (GET /booking/admin/bookings/refund-failed, refunding-stuck)로 조회하며,
// 각 항목의 refundFailedAt 타임스탬프 유무로 구분함.

// 예매 상태 — 백엔드 booking-service enum과 정확히 일치
//   PENDING: 결제 대기 (좌석 자동 HOLD 중, 5분 타이머)
//    CONFIRMED: 결제 완료
//    CANCELED: 취소됨 (환불 없음, PENDING → CANCELED or 사용자 취소)
//    REFUNDING: 환불 진행 중
//    REFUNDED: 환불 완료
//    EXPIRED: 타이머 만료 (자동 취소)

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELED"
  | "REFUNDING"
  | "REFUNDED"
  | "EXPIRED";

//  ── 예매 생성 (백엔드 확정) ──────────────────────────

//  백엔드 BookingPendingRequest 대응.

//  백엔드 필드는 snake_case (performance_id, seat_id)지만
//  axios-case-converter가 프론트의 camelCase를 자동 변환하여 전송.

//  userId는 백엔드가 JWT 토큰에서 추출하므로 프론트에서 전송하지 않음.

export interface BookingPendingRequest {
  performanceId: number;
  seatId: number;
}

//  백엔드 BookingPendingResponse 대응

//  ⚠️ 백엔드 응답 필드명은 이미 camelCase (bookingId, bookingNumber, status).
//  status만 백엔드 예시 값은 "PENDING" 고정 (예매 생성 시).

export interface BookingPendingResponse {
  bookingId: number;
  /** 사용자에게 노출되는 예매번호 (예: "X7B29-KLPW1") */
  bookingNumber: string;
  status: BookingStatus;
}

// ── 내 예매 목록 (백엔드 확정) ─────────
//  백엔드 GET /api/v1/booking/me 응답 항목 (BookingSummaryResponse).

//  필드 매핑:
//    백엔드 bookingStatus → 프론트 status (api/bookings.ts에서 매핑)
//    백엔드 응답에 createdAt 없음 → 프론트에서 optional

//  ⚠️ 백엔드가 공연/좌석 정보를 함께 주지 않음. 프론트에서 aggregation 필요:
//    - 예매마다 GET /performance/{performanceId} 별도 호출 (N+1 문제)
//    - GET /seat/numbers?seatIds= 별도 호출로 seatNumber 획득
//    - 또는 백엔드에 aggregation API 요청

export interface BookingSummary {
  bookingId: number;
  bookingNumber: string;
  performanceId: number;
  seatId: number;
  status: BookingStatus;
  /** ISO datetime — 결제 완료 시각 (PENDING은 null) */
  confirmedAt: string | null;

  // ISO datetime — 예매 생성 시각.
  // ⚠️ 백엔드 응답에 이 필드 없음. mock 호환 및 표시용으로 optional 유지.

  createdAt?: string;
}

// ── 예매 상세 (프론트 aggregation) ───────────────────

// 프론트에서 aggregation한 예매 상세.

// 백엔드 응답 자체는 BookingSummary이지만,
// TicketDetailPage/PaymentCompletePage에서 공연/좌석 정보가 필요하므로
// 다음을 조합하여 구성:
//  - BookingSummary (booking-service)
//   - PerformanceDetail (performance-service)
//   - SeatNumber (seat-service GET /seat/numbers)
export interface BookingDetail {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;

  // 공연 정보 (performance-service 조회)
  performanceId: number;
  performanceTitle: string;
  performancePerformer: string;
  performanceVenue: string;
  performanceDate: string;
  performanceTime: string;
  performanceImageMainUrl: string;

  // 좌석 정보 (seat-service 조회)
  seatId: number;
  seatNumber: string;

  // 결제 정보
  price: number;
  paidAt: string | null;

  createdAt: string;
  /** ⚠️ 스펠링: 프론트 UI 표시용. 백엔드 상태는 CANCELED. */
  cancelledAt: string | null;
}

// ── 마이페이지 표시용 항목 (프론트 aggregation) ─────
export type BookingTab = "upcoming" | "past";

//
// 마이페이지 카드에 표시할 정보.
// BookingSummary + 공연 정보 + 좌석 번호 aggregation 결과.

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
  // 백엔드는 offset 페이지네이션 (page, size).
  // 프론트에서는 전체 조회 가정 (내 예매는 수백 건 이하).
  size?: number;
  page?: number;

  // 백엔드 필터: 상태별 조회 (기본 CONFIRMED).
  // 프론트에서는 전체 상태 조회 후 클라이언트 필터링 or 상태별 호출.
  status?: BookingStatus;
}

export interface MyBookingsResponse {
  items: BookingListItem[];
  hasNext: boolean;
}

/** 내 예매 수 응답 — 백엔드 GET /booking/me/count 대응 */
export interface MyBookingCountResponse {
  count: number;
}
