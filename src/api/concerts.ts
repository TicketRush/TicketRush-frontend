// 공연 API — 가상 스펙 (백엔드 performance-service swagger 확정 대기)

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
          c.artist.toLowerCase().includes(kw),
      );
    }

    // 정렬
    if (params.sort === "PRICE_ASC") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (params.sort === "PRICE_DESC") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (params.sort === "POPULAR") {
      // 잔여석 비율이 낮을수록 인기
      filtered.sort(
        (a, b) =>
          a.remainingSeats / a.totalSeats - b.remainingSeats / b.totalSeats,
      );
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

  // 실 API (가상 엔드포인트)
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
