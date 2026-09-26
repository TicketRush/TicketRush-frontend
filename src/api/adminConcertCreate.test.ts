import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosHeaders } from "axios";
import {
  createCharacterConfig,
  restoreCharacterDraft,
} from "@/utils/character/characterConfig";
import {
  createConcertFormData,
  createPerformanceRequest,
  type CreateConcertInput,
} from "./adminConcertCreate";
import apiClient from "./instance";
import { createConcertApi } from "./admin";

const mode = vi.hoisted(() => ({ mock: false }));
vi.mock("./useMock", () => ({
  get USE_MOCK() {
    return mode.mock;
  },
}));
vi.mock("../stores/global/authStore", () => ({
  default: { getState: () => ({ accessToken: "test-token" }) },
}));

function input(): CreateConcertInput {
  return {
    form: {
      title: "테스트",
      performer: "출연진",
      genre: "CONCERT",
      venue: "공연장",
      address: "서울",
      date: "2027-01-01",
      time: "19:30",
      price: 10000,
      durationMinutes: 90,
      description: "공연 설명",
      imageMainUrl: "",
      notices: ["안내"],
      facilities: [{ icon: "P", label: "주차" }],
      characterConfig: createCharacterConfig(
        restoreCharacterDraft({ outfitModelId: "festival" })!,
      ),
      characterMessage: " 공연장에서 만나요! ",
    },
    totalSeats: 120,
    mainImage: new File(["main"], "main.png", { type: "image/png" }),
    model3d: new File(["model"], "model.glb"),
    gallery: [new File(["one"], "one.png"), new File(["two"], "two.jpg")],
  };
}

describe("performance multipart request", () => {
  it("allows a main image plus three gallery files and rejects a fourth gallery file", () => {
    const value = input();
    value.gallery = Array.from({ length: 3 }, (_, i) => new File(["image"], `${i}.png`));
    const body = createConcertFormData(value);
    expect(body.get("mainImage")).toBe(value.mainImage);
    expect(body.getAll("gallery")).toEqual(value.gallery);
    value.gallery.push(new File(["fourth"], "fourth.png"));
    expect(() => createConcertFormData(value)).toThrow("최대 3개");
  });
  it.each(["", "202--T25:00"])("builds immediate booking at request time, ignoring disabled draft %s", async (bookingOpenAt) => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-25T14:59:00Z"));
      const value = { ...input(), immediateBooking: true };
      value.form.bookingOpenAt = bookingOpenAt;
      vi.setSystemTime(new Date("2026-09-25T15:04:07Z"));
      const request = JSON.parse(await (createConcertFormData(value).get("request") as Blob).text());
      expect(request.booking_open_at).toBe("2026-09-26 00:04:07");
      expect(Object.keys(request).filter((key) => /booking|immediate|instant|status/.test(key))).toEqual(["booking_open_at"]);
    } finally { vi.useRealTimers(); }
  });
  it("keeps the selected show date and separate show time in the request Blob", async () => {
    const value = input();
    value.form.date = "2028-02-29";
    const request = JSON.parse(await (createConcertFormData(value).get("request") as Blob).text());
    expect(request.show_date).toBe("2028-02-29");
    expect(request.show_time).toBe("19:30:00");
    expect(request.character_config).toEqual(value.form.characterConfig);
    expect(request).not.toHaveProperty("showDate");
  });
  it.each([
    ["2027-08-01T20:00", "2027-08-01 20:00:00"],
    ["2026-09-22T19:00", "2026-09-22 19:00:00"],
    ["2026-09-30T20:00", "2026-09-30 20:00:00"],
    ["2026-09-30T20:00:45", "2026-09-30 20:00:45"],
    ["2028-02-29T00:00", "2028-02-29 00:00:00"],
    ["2028-02-29T20:30", "2028-02-29 20:30:00"],
  ])("maps local booking time %s into snake_case multipart JSON", async (value, expected) => {
    const data = input();
    data.form.bookingOpenAt = value;
    const mapped = createPerformanceRequest(data);
    expect(mapped.booking_open_at).toBe(expected);
    expect(mapped).not.toHaveProperty("bookingOpenAt");
    const request = JSON.parse(await (createConcertFormData(data).get("request") as Blob).text());
    expect(request.booking_open_at).toBe(expected);
    expect(request).not.toHaveProperty("bookingOpenAt");
  });

  it.each([undefined, ""])("omits an optional booking time (%s)", async (value) => {
    const data = input();
    data.form.bookingOpenAt = value;
    const request = JSON.parse(await (createConcertFormData(data).get("request") as Blob).text());
    expect(request).not.toHaveProperty("booking_open_at");
    expect(request).not.toHaveProperty("bookingOpenAt");
  });

  it("maps the real DTO and keeps characterConfig as an object", async () => {
    const value = input();
    const data = createConcertFormData(value);
    expect([...data.keys()]).toEqual([
      "request",
      "mainImage",
      "model3d",
      "gallery",
      "gallery",
    ]);
    const blob = data.get("request") as Blob;
    expect(blob.type).toBe("application/json");
    const request = JSON.parse(await blob.text());
    expect(request).toEqual({
      display_on_banner: false,
      banner_subtitle: null,
      title: "테스트",
      performer: "출연진",
      genre: "CONCERT",
      address: "서울",
      description: "공연 설명",
      show_date: "2027-01-01",
      show_time: "19:30:00",
      price: 10000,
      duration_minutes: 90,
      total_seats: 120,
      facilities: ["주차"],
      character_config: value.form.characterConfig,
      character_message: "공연장에서 만나요!",
    });
    expect(request.character_config.schemaVersion).toBe(1);
    expect(request.character_config.outfitModelId).toBe("festival");
    expect(data.get("mainImage")).toBe(value.mainImage);
    expect(data.get("model3d")).toBe(value.model3d);
    expect(data.getAll("gallery")).toEqual(value.gallery);
  });

  it("omits absent optional parts and blank messages, without changing second precision", async () => {
    const value = input();
    value.model3d = undefined;
    value.gallery = [];
    value.form.characterMessage = " \n ";
    value.form.time = "19:30:15";
    const data = createConcertFormData(value);
    expect([...data.keys()]).toEqual(["request", "mainImage"]);
    const request = JSON.parse(await (data.get("request") as Blob).text());
    expect(request).not.toHaveProperty("character_message");
    expect(request.show_time).toBe("19:30:15");
  });

  it.each([50, 51])("enforces the %i-character message boundary", (length) => {
    const value = input();
    value.form.characterMessage = "한".repeat(length);
    if (length === 50)
      expect(createPerformanceRequest(value).character_message).toHaveLength(
        50,
      );
    else expect(() => createPerformanceRequest(value)).toThrow("50");
  });
});

describe("createConcertApi with the real axios interceptors", () => {
  const previousAdapter = apiClient.defaults.adapter;
  const adapter = vi.fn(async (config) => ({
    config,
    status: 201,
    statusText: "Created",
    headers: new AxiosHeaders(),
    data: {
      is_success: true,
      code: "COMMON_201",
      result: { performance_id: 42 },
    },
  }));

  beforeEach(() => {
    mode.mock = false;
    adapter.mockClear();
    apiClient.defaults.adapter = adapter;
  });
  afterEach(() => {
    apiClient.defaults.adapter = previousAdapter;
  });

  it("posts to the real endpoint with authentication and intact multipart names", async () => {
    const value = input();
    value.totalSeats = 100_000;
    value.form.bookingOpenAt = "2026-09-30T20:00";
    await expect(createConcertApi(value)).resolves.toEqual({
      performanceId: 42,
    });
    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe("post");
    expect(config.url).toBe("/api/v1/performance/admin");
    expect(config.headers.Authorization).toBe("Bearer test-token");
    expect([...config.data.keys()]).toEqual([
      "request",
      "mainImage",
      "model3d",
      "gallery",
      "gallery",
    ]);
    const request = JSON.parse(await config.data.get("request").text());
    expect(request).toEqual(createPerformanceRequest(value));
    expect(request.total_seats).toBe(100_000);
    expect(request).not.toHaveProperty("totalSeats");
    expect(request.booking_open_at).toBe("2026-09-30 20:00:00");
    expect(request).not.toHaveProperty("bookingOpenAt");
    expect(Object.keys(request).every((key) => !/[A-Z]/.test(key))).toBe(true);
    expect(config.data.get("mainImage")).toBe(value.mainImage);
    expect(config.data.get("model3d")).toBe(value.model3d);
    expect(config.data.getAll("gallery")).toEqual(value.gallery);
    expect(request.character_config).toHaveProperty("schemaVersion", 1);
    expect(request.character_config).toHaveProperty(
      "outfitModelId",
      "festival",
    );
  });

  it.each([
    "invalid", " ", "2026-02-30T20:00", "2027-02-29T20:00",
    "2028--T", "202-01-31T20:30:45", "0999-01-31T20:30", "2028-02-T20:30", "2028-02-29T", "--T20:30",
    "2026-09-30T24:00", "2026-09-30T20:60", "2026-09-30T20:00:60",
    "2026-09-30T20:00Z", "2026-09-30T20:00+09:00",
  ])("rejects invalid booking time %s before HTTP", async (bookingOpenAt) => {
    const value = input();
    value.form.bookingOpenAt = bookingOpenAt;
    await expect(createConcertApi(value)).rejects.toThrow("올바른 예매 오픈 시각");
    expect(adapter).not.toHaveBeenCalled();
  });

  it.each(["theater", "rainbow-blouse"])("preserves opaque character keys and nested values through request transforms (%s)", async (outfitModelId) => {
    const value = input();
    const characterConfig = {
      ...createCharacterConfig(restoreCharacterDraft({
        outfitModelId,
        fanmeetCardiganColor: "#ABCDEF",
        jazzShirtColor: "#FF0000",
        jazzInnerColor: "#00FF00",
        jazzPantsColor: "#0000FF",
        fanmeetInnerColor: "#123456",
        fanmeetShortsColor: "#654321",
        fanmeetSkirtColor: "#FEDCBA",
      })!),
      customSettings: { accentColor: "#123456", original_key: "unchanged" },
    };
    value.form.characterConfig = characterConfig;

    await createConcertApi(value);

    const request = JSON.parse(
      await adapter.mock.calls[0][0].data.get("request").text(),
    );
    expect(request.character_config).toEqual(characterConfig);
    expect(request.character_config).toMatchObject({
      outfitModelId,
      fanmeetCardiganColor: "#ABCDEF",
      fanmeetInnerColor: "#123456",
      fanmeetShortsColor: "#654321",
      fanmeetSkirtColor: "#FEDCBA",
    });
    expect(request).not.toHaveProperty("characterConfig");
  });

  it.each([undefined, null])(
    "does not issue a request without a config (%s)",
    async (config) => {
      const value = input();
      value.form.characterConfig = config;
      await expect(createConcertApi(value)).rejects.toThrow("3D");
      expect(adapter).not.toHaveBeenCalled();
    },
  );

  it("blocks oversized settings and messages before HTTP", async () => {
    const value = input();
    value.form.characterConfig!.accessory = "한".repeat(4096);
    await expect(createConcertApi(value)).rejects.toThrow("4096");
    value.form.characterConfig = input().form.characterConfig;
    value.form.characterMessage = "a".repeat(51);
    await expect(createConcertApi(value)).rejects.toThrow("50");
    expect(adapter).not.toHaveBeenCalled();
  });

  it("keeps the existing mock creation flow without making HTTP requests", async () => {
    mode.mock = true;
    await expect(createConcertApi(input())).resolves.toEqual({
      id: expect.any(Number),
    });
    expect(adapter).not.toHaveBeenCalled();
  });

  it("propagates backend failures through the existing error interceptor", async () => {
    adapter.mockResolvedValueOnce({
      config: {} as never,
      status: 400,
      statusText: "Bad Request",
      headers: new AxiosHeaders(),
      data: {
        is_success: false,
        code: "VALID_400_001",
        message: "잘못된 캐릭터 설정",
        result: null,
      },
    } as never);
    await expect(createConcertApi(input())).rejects.toThrow(
      "잘못된 캐릭터 설정",
    );
  });
});

it.each([
  [false, "draft", null], [true, " subtitle ", "subtitle"],
  [true, "", null], [true, "   ", null], [false, "", null],
] as const)("serializes banner settings in multipart (%s, %j)", async (enabled, subtitle, expected) => {
  const value = input();
  value.form.displayOnBanner = enabled;
  value.form.bannerSubtitle = subtitle;
  const request = JSON.parse(await (createConcertFormData(value).get("request") as Blob).text());
  expect(request).toMatchObject({ display_on_banner: enabled, banner_subtitle: expected });
  expect(Object.keys(request).filter((key) => key.includes("banner"))).toEqual(["display_on_banner", "banner_subtitle"]);
});
