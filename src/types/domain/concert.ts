// 공연 도메인 타입
//
// 백엔드 performance-service swagger (2026-06-30) 스펙 반영
//
// 변경 이력:
// - 2026-06-30: artist→performer, date→showDate, time→showTime,
//   posterUrl→imageMainUrl, galleryUrls→imageGalleryUrls, duration→durationMinutes
//   remainingSeats 삭제 (별도 API), venue 유지 (venueName 대기)
// - 2026-07-15 (이슈 #121):
//   - status enum 정확히 백엔드 매핑: UPCOMING | ON_SALE | CLOSED | CANCELED
//     (기존 SOLD_OUT, ENDED 삭제. 매진은 seat-counts.availableCount === 0으로 판단)
//   - venue optional (백엔드에 필드 없음, address 사용 fallback)
//   - image3dUrl optional 추가 (백엔드 상세 응답)
//   - notices optional (백엔드 응답에 없음, 프론트 임시 상수 사용)
//   - totalSeats optional (목록엔 없음, 상세에만 있음)

/** 공연 장르 — 백엔드 enum과 일치 */
export type Genre =
  | "CONCERT"
  | "MUSICAL"
  | "CLASSIC"
  | "JAZZ"
  | "FESTIVAL"
  | "FANMEETING"
  | "BALLET";

/**
 * 공연 상태 — 백엔드 enum과 정확히 일치 (2026-07-15 정정)
 *   UPCOMING: 오픈 예정
 *   ON_SALE: 판매 중
 *   CLOSED: 판매 종료 (매진 or 공연 종료)
 *   CANCELED: 취소됨
 *
 * ⚠️ 매진(SOLD_OUT) 상태는 백엔드 enum에 없음.
 *   실제 "매진" 판단은 seat-counts.availableCount === 0으로 유도.
 */
export type ConcertStatus = "UPCOMING" | "ON_SALE" | "CLOSED" | "CANCELED";

/** 정렬 옵션 — 프론트 UI 전용 (백엔드 파라미터로 전달) */
export type ConcertSort = "LATEST" | "POPULAR" | "PRICE_ASC" | "PRICE_DESC";

/**
 * 공연 목록 항목 — 백엔드 PerformanceListResponse 대응
 *
 * ⚠️ 백엔드 응답의 performanceId, performanceStatus는
 * api/concerts.ts에서 id, status로 매핑됨 (프론트 관점 이름 유지).
 */
export interface ConcertSummary {
  id: number;
  title: string;
  performer: string;
  genre: Genre;
  /** ⚠️ 백엔드 응답에 없음 (venueName 필드 요청 대기, 임시 address 사용) */
  venue?: string;
  /** 공연장 주소 */
  address: string;
  /** ISO date: "YYYY-MM-DD" */
  showDate: string;
  /** "HH:mm" 또는 "HH:mm:ss" */
  showTime: string;
  price: number;
  imageMainUrl: string;
  /**
   * ⚠️ 목록 응답에는 없음 (상세에만 있음).
   * 목록에서 잔여 좌석 표시가 필요하면 useSeatCounts로 별도 조회.
   */
  totalSeats?: number;
  /**
   * ⚠️ 백엔드 응답에 없음. 필요 시 useSeatCounts 훅으로 별도 조회.
   * mock 호환 및 상위에서 주입 목적으로 optional 유지.
   */
  remainingSeats?: number;
  status: ConcertStatus;
}

/**
 * 공연 편의시설 — 프론트 UI용
 *
 * ⚠️ 백엔드 응답에서는 string[] (예: ["주차장", "수유실"]).
 * api/concerts.ts에서 icon 매핑 후 이 타입으로 변환.
 */
export interface ConcertFacility {
  /** 아이콘명 또는 이모지 */
  icon: string;
  label: string;
}

/** 공연 상세 — 백엔드 PerformanceDetailResponse 대응 */
export interface ConcertDetail extends ConcertSummary {
  description: string;
  /** 공연 시간 (분) */
  durationMinutes: number;
  facilities: ConcertFacility[];
  imageGalleryUrls: string[];
  /** ⚠️ 3D 모델 이미지 URL (예랑 담당, 현재 미사용) */
  image3dUrl?: string;
  /**
   * 예매 오픈 시각 — 백엔드 `bookingOpenAt` (UPCOMING 안내 문구용)
   * ISO datetime 문자열. null/미응답이면 오픈일 미정 안내.
   */
  bookingOpenAt?: string | null;
  /** ⚠️ 백엔드 응답에 없음. 프론트 임시 상수 fallback */
  notices?: string[];
  /** 상세는 totalSeats 필수 */
  totalSeats: number;
}

/**
 * 공연 목록 조회 파라미터 (프론트 인터페이스)
 *
 * ⚠️ 백엔드는 page 기반 페이지네이션.
 * 프론트는 cursor로 표현하되 api/concerts.ts에서 page로 매핑됨.
 */
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

/** 공연 목록 응답 (프론트 표준화 형태) */
export interface ConcertListResponse {
  items: ConcertSummary[];
  pagination: {
    hasNext: boolean;
    nextCursor: number;
    size: number;
  };
}

/**
 * 좌석 상태별 카운트 — 백엔드 seat-service SeatCountsResponse 대응
 *
 * 백엔드 응답 (snake_case → axios-case-converter가 camelCase 변환):
 *   { totalCount, availableCount, soldCount, holdCount }
 */
export interface SeatCounts {
  totalCount: number;
  availableCount: number;
  soldCount: number;
  holdCount: number;
}
