import { afterEach, expect, it, vi } from "vitest";
import { AxiosHeaders } from "axios";
import apiClient from "./instance";
import { fetchBanners, type BannerResponse } from "./banners";

vi.mock("./useMock", () => ({ USE_MOCK: false }));
const previousAdapter = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = previousAdapter; });

it.each(["여름밤의 재즈 향연", null, undefined])("maps the raw envelope through real interceptors (%s)", async (subtitle) => {
  const wire: BannerResponse = {
    performance_id: 60, title: "Summer Jazz Night", subtitle,
    description: "세계적인 재즈 뮤지션과 함께하는 특별한 밤",
    date: "2026-09-15", image_url: "https://example.com/poster.png", order: 1,
  };
  const adapter = vi.fn(async (config) => ({
    config, status: 200, statusText: "OK", headers: new AxiosHeaders(),
    data: JSON.stringify({ is_success: true, code: "COMMON_200", message: "성공입니다.", trace_id: "test", result: [wire] }),
  }));
  apiClient.defaults.adapter = adapter;
  expect(await fetchBanners()).toEqual([{
    performanceId: 60, title: wire.title, subtitle, description: wire.description,
    date: wire.date, imageUrl: wire.image_url, order: 1,
  }]);
  expect(adapter.mock.calls[0][0].url).toBe("/api/v1/banner");
});

it("keeps server ordering and handles missing images without invented fallbacks", async () => {
  apiClient.defaults.adapter = async (config) => ({
    config, status: 200, statusText: "OK", headers: new AxiosHeaders(),
    data: JSON.stringify({ is_success: true, result: [
      { performance_id: 60, title: "First", order: 2, image_url: null },
      { performance_id: 42, title: "Second", order: 1 },
    ] }),
  });
  const result = await fetchBanners();
  expect(result.map((item) => item.performanceId)).toEqual([60, 42]);
  expect(result.map((item) => item.imageUrl)).toEqual([null, undefined]);
});
