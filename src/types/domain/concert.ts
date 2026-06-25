// 공연 도메인 타입
// 가상 스펙 — 백엔드 performance-service swagger 확정 시 정렬 필요

export type Genre =
  | "CONCERT"
  | "MUSICAL"
  | "CLASSIC"
  | "JAZZ"
  | "FESTIVAL"
  | "FANMEETING"
  | "BALLET";

export type ConcertStatus = "ON_SALE" | "SOLD_OUT" | "ENDED" | "UPCOMING";

export type ConcertSort = "LATEST" | "POPULAR" | "PRICE_ASC" | "PRICE_DESC";

export interface ConcertSummary {
  id: number;
  title: string;
  artist: string;
  genre: Genre;
  venue: string;
  /** ISO date: "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  time: string;
  price: number;
  posterUrl: string;
  totalSeats: number;
  remainingSeats: number;
  status: ConcertStatus;
}

export interface ConcertFacility {
  icon: string;
  label: string;
}

export interface ConcertDetail extends ConcertSummary {
  description: string;
  address: string;
  /** minutes */
  duration: number;
  facilities: ConcertFacility[];
  galleryUrls: string[];
  notices: string[];
  gallery?: string[];
}

export interface ConcertListParams {
  cursor?: number;
  size?: number;
  genre?: Genre;
  sort?: ConcertSort;
  status?: ConcertStatus;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
}

export interface ConcertListResponse {
  items: ConcertSummary[];
  pagination: {
    hasNext: boolean;
    nextCursor: number;
    size: number;
  };
}
