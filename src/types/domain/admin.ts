// 관리자 도메인 타입
//
// NOTE: 관리자(UI/백오피스)는 프론트엔드 입력 편의성 때문에 `date` + `time`
// 조합 형태를 폼으로 유지하고 있습니다. 사용자 영역(퍼블릭)의 도메인
// 필드(`showDate`/`showTime`)와 내부 표현이 다르므로, 백엔드가 확정되면
// 폼 값은 전송시 변환(adapter)을 통해 `showDate`/`showTime`로 매핑됩니다.
//
// 관리자 API(및 mock 데이터)는 2026-06-30 기준 백엔드 미구현이므로
// `USE_MOCK = true` 상태입니다. 이 파일의 타입·주석은 현재 상태를
// 명확히 설명하기 위해 정리되어 있으며, 필드 네이밍 차이는 의도적입니다.
//
// 변경 요약(리팩터링 관련):
//   - AdminBookingItem: seatNumbers 배열로 표준화
//   - AdminSeatDetail: seatNumber 필드 정렬
//   - ConcertFormData: artist → performer, duration → durationMinutes

import type { Genre, ConcertStatus, ConcertFacility } from "./concert";
import type { BookingStatus } from "./booking";
import type { SeatStatus } from "./seat";

// ── 대시보드 ──────────────────────────────────────────
export interface AdminDashboardStats {
  totalConcerts: number;
  soldTickets: number;
  totalRevenue: number;
  /** 평균 점유율 0.0 ~ 1.0 */
  averageOccupancyRate: number;
}

export interface DailyRevenue {
  /** YYYY-MM-DD */
  date: string;
  revenue: number;
  ticketsSold: number;
}

export interface GenreRevenue {
  genre: Genre;
  /** 라벨 — 한글 표시명 */
  label: string;
  revenue: number;
  /** 백분율 (0~100) */
  percentage: number;
}

export interface ConcertSalesStatus {
  concertId: number;
  title: string;
  genre: Genre;
  date: string;
  soldSeats: number;
  totalSeats: number;
  /** 0.0 ~ 1.0 */
  occupancyRate: number;
  revenue: number;
  isSoldOut: boolean;
}

/** 관리자 공연 목록 (수정/삭제 가능한 행) */
export interface AdminConcertItem {
  id: number;
  title: string;
  genre: Genre;
  date: string;
  soldSeats: number;
  totalSeats: number;
  occupancyRate: number;
  revenue: number;
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
