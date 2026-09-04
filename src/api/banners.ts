// 배너 API — 백엔드 performance-service BannerController (develop, #564 / PR #599)
//
// 백엔드 endpoint 매핑:
//   fetchBanners → GET /api/v1/banner  (단수. /banners 아님 — 복수형은 404)
//
// 응답: BannerResponse[]  (envelope result, axios interceptor가 unwrap)
//   필드명은 프론트 BannerItem과 동일. axios-case-converter가 snake_case → camelCase.
//   옵셔널(subtitle, description, tagLabel, iconEmoji, date, linkConcertId)은
//   값 없으면 키가 생략된다 (null이 아님).
//   서버가 display_order 오름차순(동순위는 id 오름차순)으로 고정 정렬하므로
//   클라는 받은 배열 순서를 그대로 쓴다.

import type { BannerItem } from "@/types/domain/banner";
import { mockGetBanners } from "./mocks/banners";
import apiClient from "./instance";
import { USE_MOCK } from "./useMock";

export async function fetchBanners(): Promise<BannerItem[]> {
  if (USE_MOCK) return mockGetBanners();

  const res = await apiClient.get<BannerItem[]>("/api/v1/banner");
  return res.data ?? [];
}
