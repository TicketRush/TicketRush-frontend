// 관리자 도메인 타입
//
// NOTE: 관리자(UI/백오피스)는 프론트엔드 입력 편의성 때문에 `date` + `time`
// 조합 형태를 폼으로 유지하고 있습니다. 사용자 영역(퍼블릭)의 도메인
// 필드(`showDate`/`showTime`)와 내부 표현이 다르므로, 백엔드가 확정되면
// 폼 값은 전송시 변환(adapter)을 통해 `showDate`/`showTime`로 매핑됩니다.
//
// 대시보드·관리자 공연 목록은 performance admin API(#563)에 맞춘다.
// 집계 필드는 전역 NON_NULL이라 실패 시 키가 생략되므로 optional이다.
//
// 변경 요약(리팩터링 관련):
//   - AdminBookingItem: seatNumbers 배열로 표준화
//   - AdminSeatDetail: seatNumber 필드 정렬
//   - ConcertFormData: artist → performer, duration → durationMinutes

import type { Genre, ConcertStatus, ConcertFacility } from "./concert";
import type { BookingStatus } from "./booking";
import type { SeatStatus } from "./seat";

// ── 대시보드 ──────────────────────────────────────────
export interface AdminDashboardParams {
  /** YYYY-MM-DD — 일별 매출에만 적용 */
  from: string;
  /** YYYY-MM-DD — 일별 매출에만 적용 */
  to: string;
}

export interface AdminDashboardStats {
  /** registeredPerformances. 삭제 제외 전체 */
  totalConcerts: number;
  /** 예매 축 실패 시 생략 */
  soldTickets?: number;
  /** 예매 축 실패 시 생략. 기간 파라미터와 무관 */
  totalRevenue?: number;
  /** 0.0 ~ 1.0. 좌석 축 실패 시 생략. ON_SALE·CLOSED 가중평균 */
  averageOccupancyRate?: number;
  revenueComplete?: boolean;
  missingAmountBookings?: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  /** 예매 축 실패 시 생략. 빈 배열은 기간 내 매출 0 */
  dailyRevenue?: DailyRevenue[];
  /** 예매 축 실패 시 생략 */
  genreRevenue?: GenreRevenue[];
}

export interface DailyRevenue {
  /** YYYY-MM-DD */
  date: string;
  revenue: number;
  /** BE 일별 매출에는 없음. mock 전용 */
  ticketsSold?: number;
}

export interface GenreRevenue {
  genre: Genre;
  /** 라벨 — 한글 표시명 */
  label: string;
  revenue: number;
  /** 백분율 (0~100). 클라에서 매출 합으로 계산 */
  percentage: number;
}

export interface ConcertSalesStatus {
  concertId: number;
  title: string;
  genre: Genre;
  genreName?: string;
  date: string;
  soldSeats?: number;
  totalSeats?: number;
  /** 0.0 ~ 1.0 */
  occupancyRate?: number;
  revenue?: number;
  isSoldOut?: boolean;
}

export interface AdminConcertListParams {
  page?: number;
  size?: number;
}

export interface AdminConcertListResponse {
  items: AdminConcertItem[];
  pagination: {
    pageIndex: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
  };
}

/** 관리자 공연 목록 (수정/삭제 가능한 행) */
export interface AdminConcertItem {
  id: number;
  title: string;
  genre: Genre;
  /** BE `genreName`. 없으면 클라 라벨로 폴백 */
  genreName?: string;
  date: string;
  /** BE `showTime` (HH:mm:ss 등). 없으면 날짜만 표시 */
  showTime?: string;
  soldSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
  revenue?: number;
  soldOut?: boolean;
  status: ConcertStatus;
}

// ── 예매 내역 관리 ────────────────────────────────────
export interface AdminBookingStats {
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  cancelledBookings: number;
}

export interface AdminBookingItem {
  bookingNumber: string;
  concertTitle: string;
  concertDate: string;
  /** ISO datetime */
  bookedAt: string;
  userName: string;
  userEmail: string;
  /** 좌석 번호 배열 (사용자는 1인 1석이지만 관리자 표시는 배열로 일반화) */
  seatNumbers: string[];
  seatCount: number;
  unitPrice: number;
  totalAmount: number;
  status: BookingStatus;
  /** 결제 수단 ("간편결제", "신용카드" 등) */
  paymentMethod: string;
}

export interface AdminBookingListParams {
  /** offset 페이지네이션 — TanStack Table */
  page?: number;
  size?: number;
  status?: BookingStatus | "ALL";
  keyword?: string;
}

export interface AdminBookingListResponse {
  items: AdminBookingItem[];
  pagination: {
    pageIndex: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
  };
}

// ── 좌석 모니터링 ─────────────────────────────────────
export interface AdminSeatStats {
  totalSeats: number;
  availableSeats: number;
  soldSeats: number;
  holdingSeats: number;
}

export interface AdminSeatDetail {
  seatId: number;
  seatNumber: string;
  status: SeatStatus;
  /** SOLD or HOLD 상태일 때만 존재 */
  reservedBy?: string;
  /** ISO datetime — SOLD or HOLD 시 */
  reservedAt?: string;
  /** HOLD 상태일 때 남은 임시 예약 시간(초) */
  holdRemainingSec?: number;
}

// ── 공연 등록/수정 ────────────────────────────────────
/**
 * 관리자 공연 등록/수정 폼 데이터.
 *
 * 사용자 영역의 ConcertDetail과 필드명 정렬:
 *   - artist → performer
 *   - duration → durationMinutes
 *   - posterUrl → imageMainUrl
 */
export interface ConcertFormData {
  title: string;
  performer: string;
  genre: Genre;
  venue: string;
  address: string;
  date: string;
  time: string;
  price: number;
  /** 공연 시간 (분) */
  durationMinutes: number;
  description: string;
  imageMainUrl: string;
  facilities: ConcertFacility[];
  notices: string[];
}
