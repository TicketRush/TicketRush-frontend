import { mockGetBanners } from "./mocks/banners";
// import apiClient from "./instance";

const USE_MOCK = true;

export async function fetchBanners() {
  if (USE_MOCK) return mockGetBanners();
  // TODO: 민주 백엔드 API 완성 시 교체
  // const res = await apiClient.get("/api/v1/banners");
  // return res.data;
  throw new Error("Real banners API not implemented");
}
