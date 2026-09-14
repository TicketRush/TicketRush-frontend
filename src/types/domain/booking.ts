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
// ⚠️ 2026-07-18 swagger-ui 실측: REFUND_FAILED는 실제 enum 값이 아님 (제거).
// "환불 실패" 판단은 대신 booking-service의 별도 관리자 엔드포인트
// (GET /booking/admin/bookings/refund-failed, refunding-stuck)로 조회하며,
// 각 항목의 refundFailedAt 타임스탬프 유무로 구분함.

// 예매 상태 — 백엔드 booking-service enum과 정확히 일치
//   PENDING: 결제 대기 (좌석 자동 HOLD 중, 서버 expires_at까지)
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
  /** BE `yyyy-MM-dd HH:mm:ss`. PENDING·부분 응답이면 키 생략 */
  confirmedAt?: string | null;
  /** PENDING만 존재. BE `yyyy-MM-dd HH:mm:ss`, 그 외는 생략 (#559/#167) */
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

// ── 관리자: 환불 모니터링 (백엔드 확정, 2026-07-18 swagger-ui 실측) ────
// 백엔드 endpoint:
//   GET  /api/v1/booking/admin/bookings/refund-failed    (환불 처리 자체가 실패한 건)
//   GET  /api/v1/booking/admin/bookings/refunding-stuck  (REFUNDING 상태로 오래 멈춰있는 건)
//   POST /api/v1/booking/admin/{bookingNumber}/refund-retry (재시도)

// 응답은 BookingSummaryResponse와 동일 shape + userId/refundFailedAt/updatedAt.
// ⚠️ 사용자 이름/이메일/공연명/좌석번호는 이 응답에 없음
// userId만 있고
// 프론트에서 조회 가능한 "userId → 사용자 정보" API가 없어(내부 전용 API만 존재)
// 사용자 식별 정보는 표시 불가.
// 공연명/좌석번호는 performance/seat 서비스에서 aggregation.
export interface AdminRefundBookingItem {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  performanceId: number;
  seatId: number;
  status: BookingStatus;
  confirmedAt: string | null;
  refundFailedAt: string | null;
  updatedAt: string;
}

/** AdminRefundBookingItem + performance/seat aggregation (프론트 표시용) */
export interface AdminRefundBookingListItem extends AdminRefundBookingItem {
  performanceTitle: string;
  seatNumber: string;
}

export interface AdminRefundBookingListParams {
  page?: number;
  size?: number;
}

export interface AdminRefundBookingListResponse {
  items: AdminRefundBookingListItem[];
  hasNext: boolean;
}
