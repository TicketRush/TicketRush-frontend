import { describe, expect, it } from "vitest";
import {
  formatBackendDateTimeLabel,
  formatSeoulDate,
  formatSeoulDateTime,
  formatSeoulLocaleString,
} from "./formatSeoulInstant";

describe("formatSeoulInstant", () => {
  it("UTC ISO를 Asia/Seoul 날짜로 포맷한다", () => {
    expect(formatSeoulDate("2026-09-15T15:00:00.000Z")).toBe("2026-09-16");
  });

  it("UTC ISO를 Asia/Seoul YYYY-MM-DD HH:mm으로 포맷한다", () => {
    expect(formatSeoulDateTime("2026-05-22T10:30:00.000Z")).toBe(
      "2026-05-22 19:30",
    );
    expect(formatSeoulDateTime("2026-05-22 10:30:00")).toBe("2026-05-22 19:30");
  });

  it("빈 값은 fallback이다", () => {
    expect(formatSeoulDate(null)).toBe("-");
    expect(formatSeoulDateTime("")).toBe("-");
    expect(formatSeoulLocaleString(undefined)).toBe("-");
  });

  it("formatBackendDateTimeLabel은 Seoul 로케일 표기다", () => {
    const label = formatBackendDateTimeLabel("2026-09-13T03:05:00.000Z");
    expect(label).toContain("2026");
    expect(label).toMatch(/12:\s*05|오후\s*12:\s*05/);
    expect(formatBackendDateTimeLabel(null)).toBe("-");
    expect(formatBackendDateTimeLabel("not-a-date")).toBe("-");
  });
});
