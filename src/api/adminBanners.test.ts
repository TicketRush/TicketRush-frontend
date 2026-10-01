import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import apiClient from "./instance";
import { updateConcertBanner } from "./adminBanners";

vi.mock("./useMock", () => ({ USE_MOCK: false }));
vi.mock("../stores/global/authStore", () => ({ default: { getState: () => ({ accessToken: "test" }) } }));

const detail = {
  performance_id: 42, title: "Original", performer: "Artist", genre: "CLASSIC",
  description: "Keep description", show_date: "2027-01-01", show_time: "19:30:00",
  duration_minutes: 90, price: 12300, total_seats: 123, address: "Seoul",
  performance_status: "UPCOMING", booking_open_at: "2026-12-01T12:34:56",
  image_main_url: "/main.png", image3d_url: "/model.glb", image_gallery_urls: ["/gallery.png"],
  facilities: ["주차장"], character_message: "Keep message",
  character_config: { version: 1, outfitModelId: "classic", animation: "cute", opaque_key: { nested_key: "keep" } },
  display_on_banner: false, banner_subtitle: "Keep subtitle",
};
const previousAdapter = apiClient.defaults.adapter;
let serverDetail = { ...detail };
let bannerIds: number[] = [];
const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
  config, status: 200, statusText: "OK", headers: new AxiosHeaders(),
  data: JSON.stringify({ is_success: true, result: config.method === "get"
    ? config.url === "/api/v1/banner" ? bannerIds.map(id => ({ performance_id: id, title: `Concert ${id}`, order: id })) : serverDetail
    : null }),
}));
beforeEach(() => {
  serverDetail = { ...detail };
  bannerIds = [];
  adapter.mockClear();
  apiClient.defaults.adapter = adapter;
});
afterEach(() => { apiClient.defaults.adapter = previousAdapter; });

it.each([true, false])("reuses the real edit path and PATCHes only banner settings (%s)", async enabled => {
  serverDetail.display_on_banner = !enabled;
  const original = structuredClone(serverDetail);
  await updateConcertBanner({ id: 42, displayOnBanner: enabled });
  const requests = adapter.mock.calls.map(([request]) => request);
  expect(requests.some(request => request.url === "/api/v1/performance/42" && request.method === "get")).toBe(true);
  const writes = requests.filter(request => request.method !== "get");
  expect(writes).toHaveLength(1);
  expect(writes[0].url).toBe("/api/v1/performance/admin/42");
  expect(writes[0].method).toBe("patch");
  expect(JSON.parse(writes[0].data)).toEqual({ display_on_banner: enabled, banner_subtitle: enabled ? "Keep subtitle" : null });
  // Exact payload excludes booking_open_at, opaque character_config/animation,
  // total_seats and every unrelated field, preserving them on the server.
  expect(writes[0].data).not.toBeInstanceOf(FormData);
  expect(requests.some(request => request.url?.endsWith("/files"))).toBe(false);
  expect(serverDetail).toEqual(original);
});

it("checks fresh banner count before writing", async () => {
  bannerIds = [1, 2, 3];
  await expect(updateConcertBanner({ id: 42, displayOnBanner: true })).rejects.toThrow("최대 3개");
  expect(adapter.mock.calls.every(([request]) => request.method === "get")).toBe(true);
});

it.each(["detail", "banners"])("skips a duplicate detected by fresh %s data", async source => {
  if (source === "detail") serverDetail.display_on_banner = true;
  else bannerIds = [42];
  await updateConcertBanner({ id: 42, displayOnBanner: true });
  expect(adapter.mock.calls.every(([request]) => request.method === "get")).toBe(true);
});

it("allows removal at the limit without depending on the banner GET", async () => {
  serverDetail.display_on_banner = true;
  bannerIds = [42, 1, 2];
  await updateConcertBanner({ id: 42, displayOnBanner: false });
  expect(adapter.mock.calls.some(([request]) => request.method === "patch")).toBe(true);
  expect(adapter.mock.calls.some(([request]) => request.url === "/api/v1/banner")).toBe(false);
});

it("propagates server rejection after a concurrent administrator fills the last slot", async () => {
  bannerIds = [1, 2];
  apiClient.defaults.adapter = async config => {
    if (config.method === "patch") return {
      config, status: 409, statusText: "Conflict", headers: new AxiosHeaders(),
      data: JSON.stringify({ is_success: false, code: "BANNER_LIMIT", message: "배너 최대 3개 오류", result: null }),
    };
    return adapter(config);
  };
  await expect(updateConcertBanner({ id: 42, displayOnBanner: true })).rejects.toThrow("배너 최대 3개 오류");
});

it("does not write if the preflight query fails", async () => {
  apiClient.defaults.adapter = async config => {
    if (config.url === "/api/v1/banner") throw new Error("조회 실패");
    return adapter(config);
  };
  await expect(updateConcertBanner({ id: 42, displayOnBanner: true })).rejects.toThrow("네트워크 오류");
  expect(adapter.mock.calls.every(([request]) => request.method === "get")).toBe(true);
});
