import { describe, expect, it } from "vitest";
import {
  UNAVAILABLE_METRIC,
  formatAdminBooker,
  formatAdminCount,
  formatAdminDateTime,
  formatAdminOccupancy,
  formatAdminSeats,
  formatAdminShowSchedule,
  formatAdminText,
  formatAdminWon,
} from "./formatAdminMetric";

describe("formatAdminMetric", () => {
  it("null과 undefined를 집계 불가 표시로 바꾼다", () => {
    expect(formatAdminCount(undefined)).toBe(UNAVAILABLE_METRIC);
    expect(formatAdminWon(null)).toBe(UNAVAILABLE_METRIC);
    expect(formatAdminOccupancy(undefined)).toBe(UNAVAILABLE_METRIC);
    expect(formatAdminSeats(3, undefined)).toBe(UNAVAILABLE_METRIC);
  });

  it("값이 있으면 화면 형식으로 돌린다", () => {
    expect(formatAdminCount(980)).toBe("980");
    expect(formatAdminWon(147000)).toBe(`₩${(147000).toLocaleString()}`);
    expect(formatAdminOccupancy(0.317)).toBe("32%");
    expect(formatAdminSeats(38, 120)).toBe("38/120");
  });

  it("빈 문자열과 예매자 조합을 화면 형식으로 돌린다", () => {
    expect(formatAdminText("  ")).toBe(UNAVAILABLE_METRIC);
    expect(formatAdminDateTime("2026-05-22 10:30:00")).toBe(
      "2026-05-22 10:30",
    );
    expect(formatAdminBooker("김철수", "a@b.com")).toBe("김철수 (a@b.com)");
    expect(formatAdminBooker(null, "a@b.com")).toBe("a@b.com");
    expect(formatAdminBooker(undefined, undefined)).toBeUndefined();
  });

  it("공연 시각이 있으면 날짜 뒤에 HH:mm만 붙인다", () => {
    expect(formatAdminShowSchedule("2026-09-01")).toBe("2026-09-01");
    expect(formatAdminShowSchedule("2026-09-01", "19:30:00")).toBe(
      "2026-09-01 19:30",
    );
  });
});
