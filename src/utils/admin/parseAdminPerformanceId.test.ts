import { describe, expect, it } from "vitest";
import { parseAdminPerformanceId } from "./parseAdminPerformanceId";

describe("parseAdminPerformanceId", () => {
  it("양의 정수만 공연 ID로 받는다", () => {
    expect(parseAdminPerformanceId("12")).toBe(12);
    expect(parseAdminPerformanceId(undefined)).toBeNull();
    expect(parseAdminPerformanceId("")).toBeNull();
    expect(parseAdminPerformanceId("0")).toBeNull();
    expect(parseAdminPerformanceId("-1")).toBeNull();
    expect(parseAdminPerformanceId("12.5")).toBeNull();
    expect(parseAdminPerformanceId("abc")).toBeNull();
  });
});
