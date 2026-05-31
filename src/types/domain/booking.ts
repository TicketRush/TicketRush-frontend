// 예매 도메인 타입
// swagger 확정: BookingPendingRequest, BookingPendingResponse (POST /booking 하나만)
// 가상 스펙: BookingDetail, BookingListItem, MyBookings, 취소

export type BookingStatus =
  | "PENDING" // 결제 대기 (좌석 HOLD 중)
  | "CONFIRMED" // 결제 완료
  | "CANCELLED" // 취소됨
  | "EXPIRED"; // 타이머 만료

// ── 예매 생성 (swagger 확정) ─────────────────────────
export interface BookingCreateRequest {
  userId: number;
  performanceId: number;
  seatId: number;
}

export interface BookingPendingResponse {
  bookingId: number;
  /** 사용자에게 노출되는 예매번호 (예: "X7B29-KLPW1") */
  bookingNumber: string;
  status: BookingStatus;
}

// ── 예매 상세 (가상) ─────────────────────────────────
export interface BookingDetail {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;

  // 공연 정보
  performanceId: number;
  performanceTitle: string;
  performanceArtist: string;
  performanceVenue: string;
  performanceDate: string;
  performanceTime: string;
  performancePosterUrl: string;

  // 좌석 정보 (1인 1석)
  seatId: number;
  seatLabel: string;

  // 결제 정보
  price: number;
  /** ISO datetime — 결제 완료 시각 (PENDING은 null) */
  paidAt: string | null;

  // 타임스탬프
  createdAt: string;
  cancelledAt: string | null;
}

// ── 예매 목록 항목 (가상) ────────────────────────────
export interface BookingListItem {
  bookingId: number;
  bookingNumber: string;
  status: BookingStatus;
  performanceTitle: string;
  performanceVenue: string;
  performanceDate: string;
  performanceTime: string;
  performancePosterUrl: string;
  seatLabel: string;
  price: number;
  createdAt: string;
}

export interface MyBookingsParams {
  cursor?: number;
  size?: number;
  status?: BookingStatus | "ALL";
}

export interface MyBookingsResponse {
  items: BookingListItem[];
  pagination: {
    hasNext: boolean;
    nextCursor: number;
    size: number;
  };
}
