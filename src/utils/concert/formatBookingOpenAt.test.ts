import { describe, expect, it } from "vitest";
import { formatBookingOpenAt } from "./formatBookingOpenAt";

describe("formatBookingOpenAt", () => {
  it("UTC ISO를 Asia/Seoul 벽시계로 포맷한다", () => {
    // 2026-09-15 03:00 UTC = 서울 12:00
    expect(formatBookingOpenAt("2026-09-15T03:00:00.000Z")).toBe(
      "2026년 09월 15일(화) 12:00",
    );
  });

  it("+09:00 offset을 Seoul 시각 그대로 유지한다", () => {
    expect(formatBookingOpenAt("2026-09-15T12:00:00+09:00")).toBe(
      "2026년 09월 15일(화) 12:00",
    );
  });

  it("잘못된 값은 빈 문자열을 반환한다", () => {
    expect(formatBookingOpenAt("not-a-date")).toBe("");
  });
});
