// 배너 API
//
// ⚠️ 백엔드 API 미구현 상태 (2026-06-30 기준).
// USE_MOCK = true 유지. 백엔드 완성 시 순차 교체.

import { mockGetBanners } from "./mocks/banners";
// import apiClient from "./instance";

const USE_MOCK = true;

export async function fetchBanners() {
  if (USE_MOCK) return mockGetBanners();
  // const res = await apiClient.get("/api/v1/banners");
  // return res.data;
  throw new Error("Real banners API not implemented");
}
