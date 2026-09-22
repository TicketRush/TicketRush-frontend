import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import apiClient from "./instance";
import { fetchConcertForEdit, updateConcertApi } from "./admin";
import {
  createPerformancePatch,
  createConcertReplacementFiles,
} from "./adminConcertEdit";
import {
  createCharacterConfig,
  restoreCharacterDraft,
} from "@/utils/character/characterConfig";
import { validateConcertForm } from "@/utils/admin/concertFormValidation";
import { fetchConcertDetail } from "./concerts";

vi.mock("./useMock", () => ({ USE_MOCK: false }));
vi.mock("../stores/global/authStore", () => ({
  default: { getState: () => ({ accessToken: "test-token" }) },
}));

const character = {
  ...createCharacterConfig(
    restoreCharacterDraft({
      outfitModelId: "theater",
      fanmeetCardiganColor: "#123456",
      jazzShirtColor: "#FF0000",
      jazzInnerColor: "#00FF00",
      jazzPantsColor: "#0000FF",
      fanmeetInnerColor: "#234567",
      fanmeetShortsColor: "#345678",
      fanmeetSkirtColor: "#456789",
    })!,
  ),
  custom_settings: { original_key: "keep", accentColor: "#ABCDEF" },
};
const detail = {
  performance_id: 42,
  title: "서버 공연",
  performer: "출연진",
  genre: "FANMEETING",
  description: "서버 설명",
  show_date: "2020-01-01",
  show_time: "19:30:00",
  duration_minutes: 90,
  price: 10000,
  total_seats: 120,
  address: "서울",
  performance_status: "CLOSED",
  booking_open_at: "2019-12-01T20:00:00",
  image_main_url: "/old.png",
  image3d_url: "/old.glb",
  image_gallery_urls: ["/old-gallery.png"],
  facilities: ["주차장"],
  character_config: character,
  character_message: "기존 한마디",
};
const previousAdapter = apiClient.defaults.adapter;
const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
  config,
  status: 200,
  statusText: "OK",
  headers: new AxiosHeaders(),
  data: JSON.stringify({
    is_success: true,
    code: "COMMON_200",
    result:
      config.method === "get"
        ? detail
        : config.url?.endsWith("/files")
          ? {
              image_main_url: "/new.png",
              image3d_url: "/new.glb",
              image_gallery_urls: ["/new-gallery.png"],
            }
          : null,
  }),
}));
beforeEach(() => {
  adapter.mockClear();
  apiClient.defaults.adapter = adapter;
});
afterEach(() => {
  apiClient.defaults.adapter = previousAdapter;
});

async function input() {
  const { form } = await fetchConcertForEdit(42);
  adapter.mockClear();
  return { form: { ...form }, original: form };
}

describe("admin edit contract", () => {
  it.each(["UPCOMING", "ON_SALE", "CLOSED", "CANCELED"])("maps raw performance_status %s and preserves booking_open_at", async (status) => {
    adapter.mockResolvedValueOnce({ config: {} as InternalAxiosRequestConfig, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: JSON.stringify({ is_success: true, result: { ...detail, performance_status: status, booking_open_at: "2026-09-22 19:00:00" } }) });
    const result = await fetchConcertDetail(42);
    expect(result.status).toBe(status);
    expect(result.bookingOpenAt).toBe("2026-09-22 19:00:00");
  });
  it.each(["2027-08-01 20:00:45", "2027-08-01T20:00:45+09:00"])("restores KST seconds and skips unchanged PATCH for %s", async (bookingOpenAt) => {
    adapter.mockResolvedValueOnce({ config: {} as InternalAxiosRequestConfig, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: JSON.stringify({ is_success: true, result: { ...detail, performance_status: "UPCOMING", booking_open_at: bookingOpenAt } }) });
    const value = await input();
    expect(value.form.bookingOpenAt).toBe("2027-08-01 20:00:45");
    await updateConcertApi(42, value);
    expect(adapter).not.toHaveBeenCalled();
    value.form.bookingOpenAt = "2027-08-01 20:00:00";
    await updateConcertApi(42, value);
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ booking_open_at: "2027-08-01 20:00:00" });
  });
  it("restores a leap show date, skips an unchanged PATCH and changes only show_date", async () => {
    adapter.mockResolvedValueOnce({ config: {} as InternalAxiosRequestConfig, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: JSON.stringify({ is_success: true, result: { ...detail, show_date: "2028-02-29" } }) });
    const value = await input();
    expect(value.form.date).toBe("2028-02-29");
    await updateConcertApi(42, value);
    expect(adapter).not.toHaveBeenCalled();
    value.form.date = "2028-04-30";
    await updateConcertApi(42, value);
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ show_date: "2028-04-30" });
  });
  it("restores jazz from the API and PATCHes independent colors without changing opaque keys", async () => {
    const jazz = { ...character, outfitModelId: "rainbow-blouse" as const };
    adapter.mockResolvedValueOnce({ config: {} as InternalAxiosRequestConfig, status: 200, statusText: "OK", headers: new AxiosHeaders(), data: JSON.stringify({ is_success: true, result: { ...detail, character_config: jazz } }) });
    const value = await input();
    const restored = restoreCharacterDraft(value.form.characterConfig)!;
    expect(restored).toMatchObject({ outfitModelId: "rainbow-blouse", jazzShirtColor: "#FF0000", jazzInnerColor: "#00FF00", jazzPantsColor: "#0000FF" });
    value.form.characterConfig = createCharacterConfig({ ...restored, jazzInnerColor: "#ABCDEF" });
    await updateConcertApi(42, value);
    expect(JSON.parse(adapter.mock.calls[0][0].data).character_config).toEqual(value.form.characterConfig);
  });

  it.each(["2027-02-29T12:30", "2027-01-01T24:00", "2028--T", "202-01-31T20:30:45", "0999-01-31T20:30", "2028-02-T20:30", "2028-02-29T", "invalid", ""])(
    "rejects invalid or cleared booking time before HTTP (%s)", async (bookingOpenAt) => {
      const value = await input();
      value.form.bookingOpenAt = bookingOpenAt;
      await expect(updateConcertApi(42, value)).rejects.toThrow("예매 오픈 시각");
      expect(adapter).not.toHaveBeenCalled();
    },
  );

  it("preserves booking time seconds and omits an unchanged value", async () => {
    const value = await input();
    expect(createPerformancePatch(value).booking_open_at).toBeUndefined();
    value.form.bookingOpenAt = "2027-01-01T12:30:45";
    expect(createPerformancePatch(value).booking_open_at).toBe("2027-01-01 12:30:45");
  });

  it("loads the public detail and restores all form data without altering opaque keys", async () => {
    const data = await fetchConcertForEdit(42);
    expect(adapter.mock.calls[0][0].url).toBe("/api/v1/performance/42");
    expect(data).toMatchObject({
      totalSeats: 120,
      form: {
        title: "서버 공연",
        performer: "출연진",
        genre: "FANMEETING",
        venue: "서울",
        address: "서울",
        date: "2020-01-01",
        time: "19:30",
        durationMinutes: 90,
        price: 10000,
        description: "서버 설명",
        imageMainUrl: "/old.png",
        image3dUrl: "/old.glb",
        imageGalleryUrls: ["/old-gallery.png"],
        facilities: [{ label: "주차장" }],
        characterConfig: character,
        characterMessage: "기존 한마디",
        bookingOpenAt: "2019-12-01T20:00:00",
      },
    });
    expect(data.form.characterConfig).toEqual(character);
    expect(
      restoreCharacterDraft(data.form.characterConfig)?.fanmeetSkirtColor,
    ).toBe("#456789");
    expect(
      validateConcertForm({
        form: data.form,
        totalSeats: data.totalSeats,
        original: data.form,
      }),
    ).toBeNull();
  });

  it("supports legacy details without character fields", async () => {
    adapter.mockResolvedValueOnce({
      config: {} as InternalAxiosRequestConfig,
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
      data: JSON.stringify({
        is_success: true,
        result: {
          ...detail,
          character_config: undefined,
          character_message: undefined,
        },
      }),
    });
    const data = await fetchConcertForEdit(42);
    expect(data.form.characterConfig).toBeUndefined();
    expect(data.form.characterMessage).toBe("");
    expect(
      createPerformancePatch({ form: data.form, original: data.form })
        .character_config,
    ).toBeUndefined();
  });

  it("PATCHes explicit snake_case JSON while preserving the whole character object", async () => {
    const value = await input();
    value.form.time = "20:00";
    value.form.characterConfig = { ...character, fanmeetInnerColor: "#ABCDEF" };
    value.form.characterMessage = "새 한마디";
    value.form.bookingOpenAt = "2027-01-01T12:30";
    await updateConcertApi(42, value);
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe("patch");
    expect(config.url).toBe("/api/v1/performance/admin/42");
    expect(config.headers.get("Content-Type")).toBe("application/json");
    expect(config.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(config.data)).toEqual({
      show_time: "20:00:00",
      booking_open_at: "2027-01-01 12:30:00",
      character_config: value.form.characterConfig,
      character_message: "새 한마디",
    });
    expect(JSON.parse(config.data)).not.toHaveProperty("total_seats");
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each(["", "   "])(
    "deletes a message with an empty string (%j)",
    async (message) => {
      const value = await input();
      value.form.characterMessage = message;
      expect(createPerformancePatch(value).character_message).toBe("");
      await updateConcertApi(42, value);
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ character_message: "" });
    },
  );
  it("omits unchanged or absent character values and never sends existing URLs as files", async () => {
    const value = await input();
    expect(JSON.parse(JSON.stringify(createPerformancePatch(value)))).toEqual(
      {},
    );
    expect(createConcertReplacementFiles(value)).toBeNull();
    value.form.characterMessage = undefined;
    value.form.characterConfig = null;
    expect(JSON.parse(JSON.stringify(createPerformancePatch(value)))).toEqual(
      {},
    );
  });
  it("uploads only replacement files using the separate multipart endpoint", async () => {
    const value = {
      ...(await input()),
      mainImage: new File(["main"], "main.png"),
      model3d: new File(["model"], "model.glb"),
      gallery: [new File(["gallery"], "gallery.png")],
    };
    await updateConcertApi(42, value);
    expect(adapter).toHaveBeenCalledTimes(1);
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe("patch");
    expect(config.url).toBe("/api/v1/performance/admin/42/files");
    expect([...config.data.keys()]).toEqual([
      "mainImage",
      "model3d",
      "gallery",
    ]);
    expect(config.data.get("mainImage")).toBe(value.mainImage);
    expect(config.data.get("model3d")).toBe(value.model3d);
    expect(config.data.getAll("gallery")).toEqual(value.gallery);
  });
  it("omits unselected parts when replacing only a main image", async () => {
    const value = {
      ...(await input()),
      mainImage: new File(["main"], "main.png"),
    };
    expect([...createConcertReplacementFiles(value)!.keys()]).toEqual([
      "mainImage",
    ]);
  });
  it("rejects empty files, URL impostors, oversized settings and messages before HTTP", async () => {
    const value = await input();
    await expect(
      updateConcertApi(42, { ...value, mainImage: new File([], "empty.png") }),
    ).rejects.toThrow();
    await expect(
      updateConcertApi(42, {
        ...value,
        mainImage: "/old.png" as unknown as File,
      }),
    ).rejects.toThrow();
    value.form.characterConfig = { ...character, accessory: "한".repeat(4096) };
    await expect(updateConcertApi(42, value)).rejects.toThrow("4096");
    value.form.characterConfig = character;
    value.form.characterMessage = "a".repeat(51);
    await expect(updateConcertApi(42, value)).rejects.toThrow("50");
    expect(adapter).not.toHaveBeenCalled();
  });
  it("does not upload files after a failed information PATCH", async () => {
    const value = await input();
    value.form.title = "변경된 제목";
    adapter.mockRejectedValueOnce(new Error("failed"));
    await expect(
      updateConcertApi(42, { ...value, mainImage: new File(["x"], "x.png") }),
    ).rejects.toThrow();
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("reports partial success when the file request fails", async () => {
    const value = await input();
    value.form.title = "변경된 제목";
    adapter.mockImplementationOnce(async (config) => ({
      config,
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
      data: JSON.stringify({ is_success: true, result: null }),
    }));
    adapter.mockRejectedValueOnce(new Error("upload failed"));
    await expect(
      updateConcertApi(42, { ...value, mainImage: new File(["x"], "x.png") }),
    ).rejects.toThrow("정보는 저장됐지만 파일 교체에 실패");
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      "/api/v1/performance/admin/42", "/api/v1/performance/admin/42/files",
    ]);
  });
  it("makes no HTTP requests when neither information nor files changed", async () => {
    await expect(updateConcertApi(42, await input())).resolves.toBeUndefined();
    expect(adapter).not.toHaveBeenCalled();
  });
  it("accepts successful file replacements that return unchanged URLs", async () => {
    const value = await input();
    adapter.mockImplementationOnce(async (config) => ({
      config, status: 200, statusText: "OK", headers: new AxiosHeaders(),
      data: JSON.stringify({ is_success: true, result: {
        image_main_url: detail.image_main_url,
        image3d_url: detail.image3d_url,
        image_gallery_urls: detail.image_gallery_urls,
      } }),
    }));
    await expect(updateConcertApi(42, { ...value,
      mainImage: new File(["main"], "main.png"),
      model3d: new File(["model"], "model.glb"),
      gallery: [new File(["gallery"], "gallery.png")],
    })).resolves.toBeUndefined();
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("reports a file-only failure without claiming information was saved", async () => {
    const value = await input();
    adapter.mockRejectedValueOnce(new Error("upload failed"));
    const result = updateConcertApi(42, { ...value, mainImage: new File(["x"], "x.png") });
    await expect(result).rejects.toThrow(/^파일 교체에 실패했습니다\./);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].url).toBe("/api/v1/performance/admin/42/files");
  });
});
