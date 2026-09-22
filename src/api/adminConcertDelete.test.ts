import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosHeaders } from "axios";
import apiClient from "./instance";
import { deleteConcertApi } from "./admin";

const mode = vi.hoisted(() => ({ mock: false }));
vi.mock("./useMock", () => ({
  get USE_MOCK() {
    return mode.mock;
  },
}));
vi.mock("../stores/global/authStore", () => ({
  default: { getState: () => ({ accessToken: "test-token" }) },
}));

const previousAdapter = apiClient.defaults.adapter;
const adapter = vi.fn(async (config) => ({
  config,
  status: 200,
  statusText: "OK",
  headers: new AxiosHeaders(),
  data: {
    is_success: true,
    code: "COMMON_200",
    message: "성공",
    result: null,
  },
}));

describe("deleteConcertApi", () => {
  beforeEach(() => {
    mode.mock = false;
    adapter.mockClear();
    apiClient.defaults.adapter = adapter;
  });

  afterEach(() => {
    apiClient.defaults.adapter = previousAdapter;
  });

  it("calls DELETE /api/v1/performance/admin/{id}", async () => {
    await expect(deleteConcertApi(42)).resolves.toBeUndefined();

    const config = adapter.mock.calls[0][0];
    expect(config.method).toBe("delete");
    expect(config.url).toBe("/api/v1/performance/admin/42");
    expect(config.headers.Authorization).toBe("Bearer test-token");
  });

  it("surfaces the backend message instead of a client placeholder", async () => {
    adapter.mockResolvedValueOnce({
      status: 404,
      statusText: "Not Found",
      headers: new AxiosHeaders(),
      data: {
        is_success: false,
        code: "PERFORMANCE_404_001",
        message: "공연이 존재하지 않습니다.",
        result: null,
      },
    });

    await expect(deleteConcertApi(42)).rejects.toThrow(
      "공연이 존재하지 않습니다.",
    );
  });

  it("keeps the mock delete path without an HTTP request", async () => {
    mode.mock = true;
    await expect(deleteConcertApi(42)).resolves.toBeUndefined();
    expect(adapter).not.toHaveBeenCalled();
  });
});
