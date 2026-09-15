import { describe, expect, it } from "vitest";
import { formatShowDateLabel } from "./formatShowDateLabel";

describe("formatShowDateLabel", () => {
  it("YYYY-MM-DD를 그대로 반환한다 (Date 파싱 없음)", () => {
    expect(formatShowDateLabel("2026-05-22")).toBe("2026-05-22");
  });

  it("빈 값은 - 이다", () => {
    expect(formatShowDateLabel("")).toBe("-");
    expect(formatShowDateLabel("   ")).toBe("-");
    expect(formatShowDateLabel(null)).toBe("-");
    expect(formatShowDateLabel(undefined)).toBe("-");
  });

  it("앞뒤 공백만 제거한다", () => {
    expect(formatShowDateLabel(" 2026-12-31 ")).toBe("2026-12-31");
  });
});
