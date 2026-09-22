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
//- 2026-09-05 (이슈 #168 / BE #560):
//   * 단건 조회 BookingDetailResponse 매핑
//   * /booking/me 는 BookingMySummaryResponse 보강 필드 사용
//
// ⚠️ REFUND_FAILED는 예매 상태가 아니다 (#675).
// 환불 처리 상태는 조회 시 파생한다. REFUNDING → IN_PROGRESS, REFUNDED → COMPLETED,
// CONFIRMED이면서 실패 이력이 있으면 FAILED. 실패 시각만으로 분류하지 않는다.

// 예매 상태 — 백엔드 booking-service enum과 정확히 일치
//   PENDING: 결제 대기 (좌석 자동 HOLD 중, 서버 expires_at까지)
//    CONFIRMED: 결제 완료
//    CANCELED: 취소됨 (환불 없음, PENDING → CANCELED)
//    REFUNDING: 환불 신청 접수(사용자 DELETE) 또는 처리 중
//    REFUNDED: 환불 완료
//    EXPIRED: 타이머 만료 (자동 취소)

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELED"
  | "REFUNDING"
  | "REFUNDED"
  | "EXPIRED";

/** 내 예매 목록·건수에 노출하는 상태 (#339). PENDING/CANCELED/EXPIRED는 숨긴다. */
export const MY_PAGE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "CONFIRMED",
  "REFUNDING",
  "REFUNDED",
];

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

//  ⚠️ 백엔드 BookingPendingResponse: bookingId, bookingNumber, status.
//  expires_at 은 생성 응답에 없음 → GET /booking/me?status=PENDING (#559).

export interface BookingPendingResponse {
  bookingId: number;
  /** 사용자에게 노출되는 예매번호 (예: "X7B29-KLPW1") */
  bookingNumber: string;
  status: BookingStatus;
}

// ── 내 예매 목록 (백엔드 확정) ─────────
//  백엔드 GET /api/v1/booking/me 응답 항목 (BookingMySummaryResponse, #560).
//
//  필드 매핑:
//    백엔드 bookingStatus → 프론트 status (api/bookings.ts에서 매핑)
//    공연/좌석/금액은 같은 응답에 보강됨. performance·seat 조회 실패 시
//    해당 키만 생략(null 직렬화 안 함). 코어 필드와 performanceId/seatId는 유지.
//    목록에는 performanceTime이 없다. 예정/지난 탭은 **공연 날짜(performanceDate)** 기준.

export interface BookingSummary {
  bookingId: number;
  bookingNumber: string;
  performanceId: number;
  seatId: number;
  status: BookingStatus;
  /** BE Instant(UTC). naive 또는 ISO. PENDING·부분 응답이면 키 생략 (#246) */
  confirmedAt?: string | null;
  /** PENDING만. BE Instant(UTC). 그 외는 생략 (#559/#167/#246) */
  expiresAt?: string | null;
  performanceTitle?: string;
  performanceDate?: string;
  /** 공연 장소. BE `performance_address` (venue 컬럼 없음) */
  performanceAddress?: string;
  seatNumber?: string;
  /** 표시용. 출처는 공연 가격. 조회 실패 시 키 생략 */
  paymentAmount?: number;
}

// ── 예매 상세 (GET /api/v1/booking/{bookingNumber}, #560) ─
//
// 본인 예매만 조회. 타인·미존재는 동일 404.
// bookingId는 화면용이 아니라 QR 키(GET /ticket/bookings/{bookingId}/qr).
// 예매자 이름·이메일은 응답에 없음 → GET /user/me.
export interface BookingDetail {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;

  performanceId: number;
  performanceTitle: string;
  /** mock 전용. 실 API 단건 응답에는 없음 */
  performancePerformer?: string;
  /** BE `performance_address` */
  performanceVenue: string;
  performanceDate: string;
  performanceTime: string;
  /** mock 전용. 실 API 단건 응답에는 포스터가 없음 */
  performanceImageMainUrl?: string;

  seatId: number;
  seatNumber: string;

  /** BE `payment_amount`. 부분 응답이면 생략 */
  price?: number;
  /** BE `confirmed_at`. PENDING이면 생략 */
  paidAt: string | null;
  /** PENDING만. BE `expires_at` — 딥링크 타이머 복원 (#560/#168) */
  expiresAt?: string | null;

  createdAt: string;
  /** ⚠️ 스펠링: 프론트 UI 표시용. 백엔드 상태는 CANCELED. */
  cancelledAt: string | null;
}

// ── 마이페이지 표시용 항목 ─────
export type BookingTab = "upcoming" | "past";

// 마이페이지 카드. GET /booking/me 보강 필드를 그대로 매핑.
export interface BookingListItem {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;
  performanceTitle: string;
  performanceVenue: string;
  performanceDate: string;
  /** 목록 API에 없음. mock만 채움. 없으면 날짜만으로 탭 분기 */
  performanceTime?: string;
  performanceImageMainUrl?: string;
  seatNumber: string;
  price?: number;
  createdAt: string;
}

export interface MyBookingsParams {
  // 백엔드는 상태별 offset 페이지네이션 (page, size). size 상한은 50.
  // 내 예매 기본 목록은 노출 상태마다 같은 page를 받아 합친다. 합친 결과를 size로 자르지 않는다 (#380).
  size?: number;
  page?: number;

  // 백엔드 필터: 상태별 조회 (기본 CONFIRMED).
  // 내 예매 기본 목록은 CONFIRMED/REFUNDING/REFUNDED만 요청한다 (#339).
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

// ── 관리자: 환불 통합 목록 (#675) ────────────────────────
//   GET  /api/v1/booking/admin/refunds?page&size&refund_status
//   GET  /api/v1/booking/admin/refunds/stats
//   POST /api/v1/booking/admin/{bookingNumber}/refund-retry
// 좌석 번호·이메일은 내려주지 않는다. 금액은 결제액이지 PG 환불액이 아니다.
// stats는 목록 필터와 무관하게 항상 전체 모집단이다. CANCELED는 포함하지 않는다.

export type RefundProcessStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface AdminRefundListItem {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  performanceId: number;
  bookingStatus: BookingStatus;
  refundStatus: RefundProcessStatus;
  bookedAt: string;
  /** 이력이며 현재 상태가 아니다. 진행·완료 행에도 남을 수 있다. */
  refundFailedAt: string | null;
  performanceTitle: string | null;
  /** Asia/Seoul 벽시계. UTC로 변환하지 않는다. */
  performanceDate: string | null;
  performanceTime: string | null;
  bookerName: string | null;
  paymentAmount: number | null;
}

export interface AdminRefundListParams {
  page?: number;
  size?: number;
  refundStatus?: RefundProcessStatus;
}

export interface AdminRefundListResponse {
  items: AdminRefundListItem[];
  hasNext: boolean;
}

export interface AdminRefundStats {
  totalRefunds: number;
  inProgressRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
}
