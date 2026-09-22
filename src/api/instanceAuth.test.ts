// 인터셉터의 인증 동작 (이슈 #326)
//
// - 공개 조회 endpoint에는 Authorization을 붙이지 않는다
//   (서버 재시작 후 남은 만료 토큰이 붙어 홈이 통째로 실패하던 문제)
// - 관리자·보호 endpoint에는 계속 붙인다 (공개 패턴이 admin 경로를 삼키지 않는지)
// - 토큰 거부(401, 토큰 문제인 403)는 재발급 후 재시도하고, 실패하면 로그아웃한다
// - 권한 부족 403은 로그아웃하지 않는다

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import apiClient from "./instance";
import { fetchBanners } from "./banners";
import { fetchConcerts, fetchConcertDetail } from "./concerts";
import { fetchSeatCounts } from "./seats";
import { createBookingApi } from "./bookings";
import { ApiError } from "./errors/errorMapper";

const mode = vi.hoisted(() => ({ mock: false }));
vi.mock("./useMock", () => ({
  get USE_MOCK() {
    return mode.mock;
  },
}));

const auth = vi.hoisted(() => ({
  accessToken: "stale-access" as string | null,
  refreshToken: "stale-refresh" as string | null,
  logout: vi.fn(),
  setTokens: vi.fn(),
}));
vi.mock("../stores/global/authStore", () => ({
  default: { getState: () => auth },
}));

const previousAdapter = apiClient.defaults.adapter;
const replace = vi.fn();

/** 성공 응답 — 백엔드 envelope(snake_case) 그대로. 변환은 case-converter가 한다 */
function success(config: InternalAxiosRequestConfig) {
  return {
    config,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders(),
    data: {
      is_success: true,
      code: "COMMON_200",
      result: config.url === "/api/v1/performance" ? [] : {},
    },
  };
}

/**
 * 실패 응답 — 커스텀 adapter는 validateStatus를 거치지 않으므로
 * 실제 adapter가 하는 일(settle)을 대신해 AxiosError로 던진다.
 */
function failure(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): never {
  throw new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    null,
    {
      config,
      status,
      statusText: "Error",
      headers: new AxiosHeaders(),
      data,
    },
  );
}

const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
  success(config),
);

it("preserves the #673 booking rejection for the existing UI error handler", async () => {
  adapter.mockImplementationOnce(async (config) => failure(config, 400, {
    is_success: false, code: "PERFORMANCE_400_005",
    message: "예매 가능한 공연이 아닙니다.", result: null,
  }));
  const error = await createBookingApi({ performanceId: 42, seatId: 999999 }).catch((error: unknown) => error);
  expect(error).toBeInstanceOf(ApiError);
  expect(ApiError.fromUnknown(error)).toMatchObject({
    httpStatus: 400, code: "PERFORMANCE_400_005", message: "예매 가능한 공연이 아닙니다.",
  });
  expect(adapter).toHaveBeenCalledOnce();
  expect(adapter.mock.calls[0][0].url).toBe("/api/v1/booking");
  expect(auth.logout).not.toHaveBeenCalled();
});

function authorizationOf(callIndex = 0): unknown {
  return adapter.mock.calls[callIndex][0].headers.Authorization;
}

beforeEach(() => {
  mode.mock = false;
  adapter.mockClear();
  adapter.mockImplementation(async (config) => success(config));
  auth.accessToken = "stale-access";
  auth.refreshToken = "stale-refresh";
  auth.logout.mockClear();
  auth.setTokens.mockClear();
  // 실제 store와 동작을 맞춘다. 재시도 요청의 헤더는 request interceptor가
  // store에서 다시 읽어 붙이므로, 목이 토큰을 갱신하지 않으면 검증이 무의미해진다.
  auth.setTokens.mockImplementation(
    (accessToken: string, refreshToken: string) => {
      auth.accessToken = accessToken;
      auth.refreshToken = refreshToken;
    },
  );
  auth.logout.mockImplementation(() => {
    auth.accessToken = null;
    auth.refreshToken = null;
  });
  replace.mockClear();
  apiClient.defaults.adapter = adapter;
  vi.stubGlobal("window", { location: { pathname: "/", replace } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  apiClient.defaults.adapter = previousAdapter;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("공개 조회 endpoint", () => {
  it.each([
    ["공연 목록", () => fetchConcerts()],
    ["공연 상세", () => fetchConcertDetail(7)],
    ["배너", () => fetchBanners()],
    ["좌석 카운트", () => fetchSeatCounts(7)],
  ])("%s에는 Authorization을 붙이지 않는다", async (_label, call) => {
    await call();
    expect(authorizationOf()).toBeUndefined();
  });
});

describe("인증 필요 endpoint", () => {
  it.each([
    "/api/v1/performance/admin",
    "/api/v1/performance/admin/42",
    "/api/v1/performance/admin/dashboard",
    "/api/v1/seat/admin/7/monitoring",
    "/api/v1/seat/7/seat-layouts",
    "/api/v1/booking/me",
    "/api/v1/user/me",
  ])("%s에는 Authorization을 붙인다", async (url) => {
    await apiClient.get(url);
    expect(authorizationOf()).toBe("Bearer stale-access");
  });
});

describe("토큰 거부 처리", () => {
  function gatewayRejection(status: number) {
    adapter.mockImplementation(async (config) =>
      config._retry
        ? success(config)
        : failure(config, status, { status, error: "Forbidden" }),
    );
  }

  it("게이트웨이가 403으로 자르면 재발급 후 원 요청을 재시도한다", async () => {
    gatewayRejection(403);
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { result: { accessToken: "fresh", refreshToken: "fresh-refresh" } },
    });

    await apiClient.get("/api/v1/booking/me");

    expect(post).toHaveBeenCalledTimes(1);
    expect(auth.setTokens).toHaveBeenCalledWith("fresh", "fresh-refresh");
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(authorizationOf(1)).toBe("Bearer fresh");
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("401도 같은 경로로 재발급을 시도한다", async () => {
    adapter.mockImplementation(async (config) =>
      config._retry
        ? success(config)
        : failure(config, 401, {
            is_success: false,
            code: "AUTH_401_004",
            message: "만료된 토큰",
          }),
    );
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { result: { accessToken: "fresh", refreshToken: "fresh-refresh" } },
    });

    await apiClient.get("/api/v1/booking/me");

    expect(post).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("재발급이 실패하면 토큰을 지우고 로그인 페이지로 보낸다", async () => {
    gatewayRejection(403);
    vi.spyOn(axios, "post").mockRejectedValue(new Error("reissue failed"));

    await expect(apiClient.get("/api/v1/booking/me")).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
      httpStatus: 403,
    });

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("refresh 토큰이 없으면 재발급을 시도하지 않고 로그아웃한다", async () => {
    gatewayRejection(403);
    auth.refreshToken = null;
    const post = vi.spyOn(axios, "post");

    await expect(apiClient.get("/api/v1/booking/me")).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });

    expect(post).not.toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("이미 로그인 페이지면 토큰만 지우고 리다이렉트하지 않는다", async () => {
    gatewayRejection(403);
    vi.stubGlobal("window", { location: { pathname: "/login", replace } });
    vi.spyOn(axios, "post").mockRejectedValue(new Error("reissue failed"));

    await expect(apiClient.get("/api/v1/booking/me")).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
    });

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("권한 부족 403은 재발급도 로그아웃도 하지 않는다", async () => {
    adapter.mockImplementation(async (config) =>
      failure(config, 403, {
        is_success: false,
        code: "AUTH_403_001",
        message: "접근 권한이 없습니다.",
      }),
    );
    const post = vi.spyOn(axios, "post");

    await expect(
      apiClient.get("/api/v1/performance/admin/dashboard"),
    ).rejects.toMatchObject({ code: "AUTH_403_001", httpStatus: 403 });

    expect(post).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it("mock 모드에서는 실 /reissue를 호출하지 않는다", async () => {
    mode.mock = true;
    gatewayRejection(403);
    const post = vi.spyOn(axios, "post");

    await apiClient.get("/api/v1/booking/me");

    expect(post).not.toHaveBeenCalled();
    expect(auth.setTokens).toHaveBeenCalled();
    expect(String(auth.setTokens.mock.calls[0][0])).toMatch(/^mock-access-/);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("공개 endpoint의 401은 재발급 대상이 아니다", async () => {
    adapter.mockImplementation(async (config) =>
      failure(config, 401, {
        is_success: false,
        code: "COMMON_401",
        message: "인증이 필요합니다.",
      }),
    );
    const post = vi.spyOn(axios, "post");

    await expect(fetchConcerts()).rejects.toMatchObject({
      code: "COMMON_401",
    });

    expect(post).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
