import { describe, expect, it } from "vitest";
import {
  dashboardCalendarView,
  defaultDashboardRange,
  fillDailyRevenueGaps,
  inclusiveDayCount,
  isDashboardCalendarDateDisabled,
  isDashboardPeriodWithinLimit,
  parseLocalDateKey,
  resolveDashboardCalendarClick,
  toLocalDateKey,
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

describe("isDashboardCalendarDateDisabled", () => {
  it("시작일을 고르기 전에는 비활성 날짜가 없다", () => {
    expect(
      isDashboardCalendarDateDisabled(null, parseLocalDateKey("2026-04-03")),
    ).toBe(false);
  });

  it("시작일 기준 92일은 선택 가능하고 93일은 비활성이다", () => {
    const start = parseLocalDateKey("2026-01-01");
    expect(
      isDashboardCalendarDateDisabled(start, parseLocalDateKey("2026-04-02")),
    ).toBe(false);
    expect(
      isDashboardCalendarDateDisabled(start, parseLocalDateKey("2026-04-03")),
    ).toBe(true);
  });

  it("시작일보다 이전으로도 상한을 넘으면 비활성이다", () => {
    const start = parseLocalDateKey("2026-04-03");
    expect(
      isDashboardCalendarDateDisabled(start, parseLocalDateKey("2026-01-02")),
    ).toBe(false);
    expect(
      isDashboardCalendarDateDisabled(start, parseLocalDateKey("2026-01-01")),
    ).toBe(true);
  });
});

describe("resolveDashboardCalendarClick", () => {
  it("첫 클릭은 시작일만 잡는다", () => {
    const clicked = parseLocalDateKey("2026-01-01");
    expect(resolveDashboardCalendarClick(null, clicked)).toEqual({
      action: "set-start",
      date: clicked,
    });
  });

  it("상한 안의 끝점을 고르면 기간을 확정한다", () => {
    const start = parseLocalDateKey("2026-01-01");
    const end = parseLocalDateKey("2026-04-02");
    expect(resolveDashboardCalendarClick(start, end)).toEqual({
      action: "confirm",
      start,
      end,
    });
  });

  it("끝점이 시작일보다 이전이면 기간을 뒤집어서 확정한다", () => {
    const pendingStart = parseLocalDateKey("2026-04-02");
    const clicked = parseLocalDateKey("2026-01-01");
    expect(resolveDashboardCalendarClick(pendingStart, clicked)).toEqual({
      action: "confirm",
      start: clicked,
      end: pendingStart,
    });
  });

  it("상한 초과는 시작일을 유지하고 기간을 확정하지 않는다", () => {
    const start = parseLocalDateKey("2026-01-01");
    const beyond = parseLocalDateKey("2026-04-03");
    expect(resolveDashboardCalendarClick(start, beyond)).toEqual({
      action: "ignore",
    });
  });

  it("같은 날을 다시 고르면 하루 기간으로 확정한다", () => {
    const day = parseLocalDateKey("2026-01-01");
    expect(resolveDashboardCalendarClick(day, day)).toEqual({
      action: "confirm",
      start: day,
      end: day,
    });
  });
});

describe("dashboardCalendarView", () => {
  it("월초에 기본 30일이면 지난달이 아니라 당월을 보여준다", () => {
    const today = parseLocalDateKey("2026-09-01");
    const range = defaultDashboardRange(today);

    expect(toLocalDateKey(range.start)).toBe("2026-08-03");
    expect(toLocalDateKey(range.end)).toBe("2026-09-01");
    expect(inclusiveDayCount(range.start, range.end)).toBe(30);
    expect(dashboardCalendarView(range)).toEqual({ year: 2026, month: 8 });
  });

  it("조회 기간이 당월에만 있어도 종료일 월을 보여준다", () => {
    const range = {
      start: parseLocalDateKey("2026-09-01"),
      end: parseLocalDateKey("2026-09-22"),
    };
    expect(dashboardCalendarView(range)).toEqual({ year: 2026, month: 8 });
  });

  it("과거 기간만 고르면 종료일이 있는 달을 보여준다", () => {
    const range = {
      start: parseLocalDateKey("2026-07-01"),
      end: parseLocalDateKey("2026-07-31"),
    };
    expect(dashboardCalendarView(range)).toEqual({ year: 2026, month: 6 });
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
