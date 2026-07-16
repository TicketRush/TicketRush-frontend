// 공연 API — 백엔드 performance-service swagger (2026-06-30) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   fetchConcerts       → GET /api/v1/performance (page 기반)
//   fetchConcertDetail  → GET /api/v1/performance/{id}
//
// 변경 이력:
// - 2026-07-15 (이슈 #121):
//   - 실 API 응답 매핑 로직 추가:
//     * performanceId → id
//     * performanceStatus → status
//     * venue 필드 없음 → 임시로 address 값 대체 사용
//     * facilities: string[] → ConcertFacility[] (icon 매핑)
//   - 페이지네이션 매핑: cursor(프론트) ↔ page(백엔드)
//   - useless try/catch 제거 (예외 자동 전파)
//
// 주의:
//   - 프론트 관점의 "concert" 도메인은 백엔드 "performance" 서비스와 매핑됨.
//   - remainingSeats는 백엔드 응답에 없음. 실 API 연동 시 useSeatCounts로 별도 조회.
//     mock은 편의상 필드 유지 (optional).

import type {
  ConcertDetail,
  ConcertFacility,
  ConcertListParams,
  ConcertListResponse,
  ConcertStatus,
  ConcertSummary,
  Genre,
} from "@/types/domain/concert";
import { MOCK_CONCERTS, getMockConcertDetail } from "./mocks/concerts";
import { mockDelay, mockError } from "./mocks/_helpers";
import apiClient from "./instance";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// -------------------------------------------------------
// 백엔드 응답 타입 (원본 스펙)
// -------------------------------------------------------

/** 백엔드 PerformanceListResponse (원본 스펙) */
interface PerformanceListResponse {
  performanceId: number;
  title: string;
  performer: string;
  genre: Genre;
  showDate: string;
  showTime: string;
  address: string;
  imageMainUrl: string;
  performanceStatus: ConcertStatus;
  price: number;
}

/** 백엔드 PerformanceDetailResponse (원본 스펙) */
interface PerformanceDetailResponse {
  performanceId: number;
  title: string;
  performer: string;
  genre: Genre;
  description: string;
  showDate: string;
  showTime: string;
  durationMinutes: number;
  price: number;
  totalSeats: number;
  address: string;
  performanceStatus: ConcertStatus;
  imageMainUrl: string;
  image3dUrl?: string;
  imageGalleryUrls: string[];
  facilities: string[]; // 백엔드는 문자열 배열
}

/** 백엔드 PageInfo */
interface BackendPageInfo {
  pageIndex: number;
  size: number;
  hasNext: boolean;
  totalElements?: number;
  totalPages?: number;
}

// -------------------------------------------------------
// 매핑 함수
// -------------------------------------------------------

/**
 * 편의시설 문자열 → 아이콘 매핑
 * 백엔드는 "주차장", "수유실" 같은 문자열만 반환 → 프론트에서 icon 매핑
 */
function mapFacilityIcon(label: string): string {
  const ICON_MAP: Record<string, string> = {
    주차장: "🅿️",
    수유실: "🚻",
    장애인석: "♿",
    "무료 Wi-Fi": "📶",
    푸드코트: "🍽️",
    "음향 시스템": "🔊",
    카페: "☕",
    물품보관함: "🎒",
  };

  // 완전 일치 우선, 부분 매칭 fallback
  if (ICON_MAP[label]) return ICON_MAP[label];
  for (const key in ICON_MAP) {
    if (label.includes(key)) return ICON_MAP[key];
  }
  return "✅"; // 기본 아이콘
}

function mapListItem(item: PerformanceListResponse): ConcertSummary {
  return {
    id: item.performanceId,
    title: item.title,
    performer: item.performer,
    genre: item.genre,
    // ⚠️ venue 필드 없음 — venueName 백엔드 요청 대기, 임시로 address 사용
    venue: item.address,
    address: item.address,
    showDate: item.showDate,
    // "HH:mm:ss" 형식이면 "HH:mm"으로 자르기 (UI 표시 편의)
    showTime: item.showTime?.slice(0, 5) ?? item.showTime,
    price: item.price,
    imageMainUrl: item.imageMainUrl,
    status: item.performanceStatus,
    // totalSeats, remainingSeats는 목록 응답에 없음
  };
}

function mapDetail(item: PerformanceDetailResponse): ConcertDetail {
  return {
    id: item.performanceId,
    title: item.title,
    performer: item.performer,
    genre: item.genre,
    description: item.description,
    venue: item.address, // ⚠️ venue 필드 없음, 임시 address 사용
    address: item.address,
    showDate: item.showDate,
    showTime: item.showTime?.slice(0, 5) ?? item.showTime,
    durationMinutes: item.durationMinutes,
    price: item.price,
    totalSeats: item.totalSeats,
    imageMainUrl: item.imageMainUrl,
    image3dUrl: item.image3dUrl,
    imageGalleryUrls: item.imageGalleryUrls ?? [],
    facilities: (item.facilities ?? []).map<ConcertFacility>((f) => ({
      icon: mapFacilityIcon(f),
      label: f,
    })),
    status: item.performanceStatus,
    // notices는 백엔드에 없음 → 프론트 페이지에서 fallback 상수 사용
  };
}

// -------------------------------------------------------
// Mock 헬퍼
// -------------------------------------------------------

async function buildMockConcertListResponse(
  params: ConcertListParams = {},
): Promise<ConcertListResponse> {
  await mockDelay();

  let filtered = [...MOCK_CONCERTS];

  if (params.genre) {
    filtered = filtered.filter((c) => c.genre === params.genre);
  }
  if (params.status) {
    filtered = filtered.filter((c) => c.status === params.status);
  }
  if (params.minPrice !== undefined) {
    filtered = filtered.filter((c) => c.price >= params.minPrice!);
  }
  if (params.maxPrice !== undefined) {
    filtered = filtered.filter((c) => c.price <= params.maxPrice!);
  }
  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(kw) ||
        c.performer.toLowerCase().includes(kw),
    );
  }

  // 정렬
  if (params.sort === "PRICE_ASC") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (params.sort === "PRICE_DESC") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (params.sort === "POPULAR") {
    filtered.sort((a, b) => {
      const remA = a.remainingSeats ?? a.totalSeats ?? 0;
      const remB = b.remainingSeats ?? b.totalSeats ?? 0;
      const totalA = a.totalSeats ?? 1;
      const totalB = b.totalSeats ?? 1;
      return remA / totalA - remB / totalB;
    });
  }
  // LATEST는 기본 순서 유지

  // Cursor 페이지네이션 (mock)
  const size = params.size ?? 8;
  const cursor = params.cursor ?? 0;
  const items = filtered.slice(cursor, cursor + size);

  return {
    items,
    pagination: {
      hasNext: cursor + size < filtered.length,
      nextCursor: cursor + size,
      size,
    },
  };
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export async function fetchConcerts(
  params: ConcertListParams = {},
): Promise<ConcertListResponse> {
  if (USE_MOCK) {
    return buildMockConcertListResponse(params);
  }

  // ⚠️ 프론트 cursor → 백엔드 page 매핑
  // cursor를 page index로 취급 (첫 요청 cursor=0, size=8 → page=0, size=8)
  const size = params.size ?? 8;
  const cursorValue = params.cursor ?? 0;
  const pageIndex = Math.floor(cursorValue / size);

  // sort 매핑 — 프론트 enum → 백엔드 문자열 형식 ("property,DIRECTION")
  const backendSort = mapSort(params.sort);

  const backendParams: Record<string, unknown> = {
    page: pageIndex,
    size,
  };
  if (params.genre) backendParams.genre = params.genre;
  if (params.status) backendParams.status = params.status;
  if (params.minPrice !== undefined) backendParams.minPrice = params.minPrice;
  if (params.maxPrice !== undefined) backendParams.maxPrice = params.maxPrice;
  if (backendSort) backendParams.sort = backendSort;

  // 백엔드 응답: { result: PerformanceListResponse[], paginationInfo: PageInfo }
  // instance.ts interceptor가 result → data.data로 unwrap하고 paginationInfo → data.pagination로 분리
  const res = await apiClient.get<PerformanceListResponse[]>(
    "/api/v1/performance",
    { params: backendParams },
  );

  const items = (res.data ?? []).map(mapListItem);
  const backendPageInfo = res.pagination as unknown as
    | BackendPageInfo
    | undefined;

  const hasNext = backendPageInfo?.hasNext ?? false;
  const nextCursor = (pageIndex + 1) * size;

  return {
    items,
    pagination: {
      hasNext,
      nextCursor,
      size,
    },
  };
}

export async function fetchConcertDetail(id: number): Promise<ConcertDetail> {
  if (USE_MOCK) {
    await mockDelay();
    const detail = getMockConcertDetail(id);
    if (!detail) {
      await mockError("CONCERT_NOT_FOUND", "공연을 찾을 수 없습니다.");
    }
    return detail!;
  }

  const res = await apiClient.get<PerformanceDetailResponse>(
    `/api/v1/performance/${id}`,
  );
  return mapDetail(res.data);
}

// -------------------------------------------------------
// 유틸
// -------------------------------------------------------

/**
 * 프론트 sort enum → 백엔드 sort 문자열 형식
 * 백엔드 형식: "property,DIRECTION" (예: "createdAt,DESC")
 * 지원 정렬 property는 백엔드 스펙 확인 필요 (현재는 추정치).
 *
 * ⚠️ 백엔드에서 지원하는 sort property 목록 확인 필요.
 * 지원 안 되는 값은 백엔드에서 400 반환할 수 있음.
 */
function mapSort(sort?: string): string | undefined {
  if (!sort || sort === "LATEST") return "createdAt,DESC";
  if (sort === "PRICE_ASC") return "price,ASC";
  if (sort === "PRICE_DESC") return "price,DESC";
  // POPULAR은 백엔드에서 정렬 기준 정의 필요 — 임시로 createdAt
  return "createdAt,DESC";
}
