import { describe, expect, it } from "vitest";
import {
  UNAVAILABLE_METRIC,
  formatAdminCount,
  formatAdminOccupancy,
  formatAdminSeats,
  formatAdminShowSchedule,
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

  it("공연 시각이 있으면 날짜 뒤에 HH:mm만 붙인다", () => {
    expect(formatAdminShowSchedule("2026-09-01")).toBe("2026-09-01");
    expect(formatAdminShowSchedule("2026-09-01", "19:30:00")).toBe(
      "2026-09-01 19:30",
    );
  });
});
