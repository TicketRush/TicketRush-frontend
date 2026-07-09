// 관리자 도메인 타입
//
// ⚠️ 관리자 API는 백엔드 미구현 상태 (2026-06-30 기준)
// USE_MOCK = true 유지. 백엔드 완성 시 순차 교체.
//
// 이번 리팩터링에서는 다른 도메인(concert, seat, booking)의 필드명 변경에 맞춰
// import 및 필드명만 정렬. mock 데이터 구조는 유지.
//
// 주요 변경:
//   - AdminBookingItem.seatLabels → seatNumbers (seat 도메인 필드명 정렬)
//   - AdminSeatDetail.seatLabel → seatNumber
//   - ConcertFormData.artist → performer, duration → durationMinutes 등

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
