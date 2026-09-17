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

vi.mock("./useMock", () => ({ USE_MOCK: false }));
vi.mock("../stores/global/authStore", () => ({
  default: { getState: () => ({ accessToken: "test-token" }) },
}));

const character = {
  ...createCharacterConfig(
    restoreCharacterDraft({
      outfitModelId: "theater",
      fanmeetCardiganColor: "#123456",
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
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it.each(["", "   "])(
    "deletes a message with an empty string (%j)",
    async (message) => {
      const value = await input();
      value.form.characterMessage = message;
      expect(createPerformancePatch(value).character_message).toBe("");
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
    const config = adapter.mock.calls[1][0];
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
    adapter.mockRejectedValueOnce(new Error("failed"));
    await expect(
      updateConcertApi(42, { ...value, mainImage: new File(["x"], "x.png") }),
    ).rejects.toThrow();
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it("reports partial success when the file request fails", async () => {
    const value = await input();
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
  });
});
