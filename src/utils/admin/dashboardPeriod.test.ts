import { describe, expect, it } from "vitest";
import {
  fillDailyRevenueGaps,
  inclusiveDayCount,
  isDashboardPeriodWithinLimit,
  parseLocalDateKey,
} from "./dashboardPeriod";

describe("inclusiveDayCount", () => {
  it("같은 날은 1일이다", () => {
    const day = parseLocalDateKey("2026-08-07");
    expect(inclusiveDayCount(day, day)).toBe(1);
  });

  it("BE와 같이 92일 경계는 통과한다", () => {
    const from = parseLocalDateKey("2026-01-01");
    const to = parseLocalDateKey("2026-04-02");
    expect(inclusiveDayCount(from, to)).toBe(92);
    expect(isDashboardPeriodWithinLimit(from, to)).toBe(true);
  });

  it("93일은 상한을 넘는다", () => {
    const from = parseLocalDateKey("2026-01-01");
    const to = parseLocalDateKey("2026-04-03");
    expect(inclusiveDayCount(from, to)).toBe(93);
    expect(isDashboardPeriodWithinLimit(from, to)).toBe(false);
  });

  it("시작일이 종료일보다 늦으면 유효하지 않다", () => {
    expect(
      isDashboardPeriodWithinLimit(
        parseLocalDateKey("2026-08-07"),
        parseLocalDateKey("2026-07-09"),
      ),
    ).toBe(false);
  });
});

describe("fillDailyRevenueGaps", () => {
  it("매출이 없는 날을 0으로 채운다", () => {
    const filled = fillDailyRevenueGaps(
      [{ date: "2026-08-02", revenue: 1000 }],
      "2026-08-01",
      "2026-08-03",
    );
    expect(filled).toEqual([
      { date: "2026-08-01", revenue: 0 },
      { date: "2026-08-02", revenue: 1000 },
      { date: "2026-08-03", revenue: 0 },
    ]);
  });
});
