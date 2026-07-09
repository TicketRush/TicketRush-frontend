// 공연 API — 백엔드 performance-service swagger (2026-06-30) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   fetchConcerts       → GET /api/v1/performance
//   fetchConcertDetail  → GET /api/v1/performance/{id}
//
// 주의:
//   - 프론트 관점의 "concert" 도메인은 백엔드 "performance" 서비스와 매핑됨.
//     파일명/타입명은 프론트 관점 유지 (변경 부담 최소화).
//   - remainingSeats는 백엔드 응답에 없음. 실 API 연동 시 useSeatCounts로 별도 조회.
//     mock은 편의상 필드 유지 (optional).

import type {
  ConcertDetail,
  ConcertListParams,
  ConcertListResponse,
} from "@/types/domain/concert";
import { MOCK_CONCERTS, getMockConcertDetail } from "./mocks/concerts";
import { mockDelay, mockError } from "./mocks/_helpers";
// import apiClient from "./instance"; // 실 API 시 주석 해제

const USE_MOCK = true;

export async function fetchConcerts(
  params: ConcertListParams = {},
): Promise<ConcertListResponse> {
  if (USE_MOCK) {
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
      // 잔여석 비율이 낮을수록 인기
      // remainingSeats가 optional이 됐으므로 nullish coalescing으로 안전 처리
      filtered.sort((a, b) => {
        const remA = a.remainingSeats ?? a.totalSeats;
        const remB = b.remainingSeats ?? b.totalSeats;
        return remA / a.totalSeats - remB / b.totalSeats;
      });
    }
    // LATEST는 기본 순서 유지

    // Cursor 페이지네이션
    const size = params.size ?? 10;
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

  // 실 API — GET /api/v1/performance
  // const res = await apiClient.get<ConcertListResponse>("/api/v1/performance", { params });
  // return res.data;
  throw new Error("Real API not implemented");
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
  // const res = await apiClient.get<ConcertDetail>(`/api/v1/performance/${id}`);
  // return res.data;
  throw new Error("Real API not implemented");
}
