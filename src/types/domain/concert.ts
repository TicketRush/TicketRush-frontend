// 공연 도메인 타입
//
// 백엔드 performance-service swagger (2026-06-30) 스펙 반영
//
// 주요 변경 (프론트 mock → 백엔드 스펙):
//   - artist → performer
//   - date → showDate
//   - time → showTime
//   - duration → durationMinutes
//   - posterUrl → imageMainUrl
//   - galleryUrls / gallery → imageGalleryUrls (통합)
//   - remainingSeats → 삭제 (별도 API: GET /seat/:id/seat-counts)
//   - venue → 유지 (⚠️ 백엔드 확정 대기, 현재는 address 활용)

/** 공연 장르 — 백엔드 enum과 일치 */
export type Genre =
  | "CONCERT"
  | "MUSICAL"
  | "CLASSIC"
  | "JAZZ"
  | "FESTIVAL"
  | "FANMEETING"
  | "BALLET";

/** 공연 상태 — 백엔드 enum과 일치 */
export type ConcertStatus = "ON_SALE" | "SOLD_OUT" | "ENDED" | "UPCOMING";

/** 정렬 옵션 — 프론트 UI 전용 (백엔드 파라미터로 전달) */
export type ConcertSort = "LATEST" | "POPULAR" | "PRICE_ASC" | "PRICE_DESC";

/** 공연 목록 항목 — 백엔드 PerformanceListResponse 대응 */
export interface ConcertSummary {
  id: number;
  title: string;
  performer: string;
  genre: Genre;
  /** ⚠️ 백엔드 응답 확정 시 조정 필요 (현재는 address와 병행 사용 예정) */
  venue: string;
  /** 공연장 주소 */
  address: string;
  /** ISO date: "YYYY-MM-DD" — 백엔드 필드명 showDate */
  showDate: string;
  /** "HH:mm" — 백엔드 필드명 showTime */
  showTime: string;
  price: number;
  /** 백엔드 필드명 imageMainUrl (기존 posterUrl) */
  imageMainUrl: string;
  totalSeats: number;
  /**
   * ⚠️ remainingSeats는 백엔드 응답에 없음.
   * 잔여 좌석 표시가 필요한 UI에서는 useSeatCounts 훅으로 별도 조회.
   * 이 필드는 mock 데이터 호환을 위해 optional로 유지.
   */
  remainingSeats?: number;
  status: ConcertStatus;
}

/** 공연 편의시설 — 백엔드 응답의 facilities 배열 항목 */
export interface ConcertFacility {
  /** 아이콘명 또는 이모지 */
  icon: string;
  label: string;
}

/** 공연 상세 — 백엔드 PerformanceDetailResponse 대응 */
export interface ConcertDetail extends ConcertSummary {
  description: string;
  /** 공연 시간 (분) — 백엔드 필드명 durationMinutes (기존 duration) */
  durationMinutes: number;
  facilities: ConcertFacility[];
  /** 백엔드 필드명 imageGalleryUrls (기존 galleryUrls/gallery 통합) */
  imageGalleryUrls: string[];
  notices: string[];
}

/** 공연 목록 조회 파라미터 */
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

/** 공연 목록 응답 */
export interface ConcertListResponse {
  items: ConcertSummary[];
  pagination: {
    hasNext: boolean;
    nextCursor: number;
    size: number;
  };
}
