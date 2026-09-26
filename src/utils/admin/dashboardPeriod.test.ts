import { describe, expect, it } from "vitest";
import {
  dashboardCalendarDisabledReason,
  dashboardCalendarDisabledTitle,
  dashboardCalendarView,
  defaultDashboardRange,
  fillDailyRevenueGaps,
  inclusiveDayCount,
  isDashboardCalendarDateDisabled,
  isDashboardPeriodQueryable,
  isDashboardPeriodWithinLimit,
  parseLocalDateKey,
  resolveDashboardRangeChange,
  resolveDashboardCalendarCancel,
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
  const today = parseLocalDateKey("2026-09-25");

  it("시작일을 고르기 전에는 오늘과 과거만 고를 수 있다", () => {
    expect(
      isDashboardCalendarDateDisabled(
        null,
        parseLocalDateKey("2026-04-03"),
        92,
        today,
      ),
    ).toBe(false);
    expect(
      isDashboardCalendarDateDisabled(
        null,
        parseLocalDateKey("2026-09-25"),
        92,
        today,
      ),
    ).toBe(false);
    expect(
      isDashboardCalendarDateDisabled(
        null,
        parseLocalDateKey("2026-09-26"),
        92,
        today,
      ),
    ).toBe(true);
  });

  it("미래이면서 92일을 넘는 날짜는 미래 이유를 우선한다", () => {
    const start = parseLocalDateKey("2026-09-01");
    const farFuture = parseLocalDateKey("2026-12-31");
    expect(
      dashboardCalendarDisabledReason(start, farFuture, today),
    ).toBe("future");
    expect(dashboardCalendarDisabledTitle("future")).toBe(
      "오늘 이후 날짜는 선택할 수 없습니다",
    );
    expect(dashboardCalendarDisabledTitle("over-max")).toBe(
      "최대 92일까지 선택할 수 있습니다",
    );
  });

  it("시작일 기준 92일은 선택 가능하고 93일은 비활성이다", () => {
    const start = parseLocalDateKey("2026-01-01");
    expect(
      isDashboardCalendarDateDisabled(
        start,
        parseLocalDateKey("2026-04-02"),
        92,
        today,
      ),
    ).toBe(false);
    expect(
      dashboardCalendarDisabledReason(
        start,
        parseLocalDateKey("2026-04-03"),
        today,
      ),
    ).toBe("over-max");
  });

  it("시작일보다 이전으로도 상한을 넘으면 비활성이다", () => {
    const start = parseLocalDateKey("2026-04-03");
    expect(
      isDashboardCalendarDateDisabled(
        start,
        parseLocalDateKey("2026-01-02"),
        92,
        today,
      ),
    ).toBe(false);
    expect(
      isDashboardCalendarDateDisabled(
        start,
        parseLocalDateKey("2026-01-01"),
        92,
        today,
      ),
    ).toBe(true);
  });
});

describe("isDashboardPeriodQueryable", () => {
  const today = parseLocalDateKey("2026-09-25");

  it("오늘을 포함한 과거 92일 이내는 조회한다", () => {
    expect(
      isDashboardPeriodQueryable(
        parseLocalDateKey("2026-06-26"),
        parseLocalDateKey("2026-09-25"),
        today,
      ),
    ).toBe(true);
  });

  it("과거라도 92일을 넘거나 순서가 뒤집히면 조회하지 않는다", () => {
    expect(
      isDashboardPeriodQueryable(
        parseLocalDateKey("2026-01-01"),
        parseLocalDateKey("2026-04-03"),
        today,
      ),
    ).toBe(false);
    expect(
      isDashboardPeriodQueryable(
        parseLocalDateKey("2026-04-03"),
        parseLocalDateKey("2026-01-01"),
        today,
      ),
    ).toBe(false);
  });

  it("92일을 넘는 과거 기간은 조회하지 않는다", () => {
    expect(
      isDashboardPeriodQueryable(
        parseLocalDateKey("2026-01-01"),
        parseLocalDateKey("2026-04-03"),
        today,
      ),
    ).toBe(false);
  });

  it("종료일이나 시작일이 오늘 이후면 조회하지 않는다", () => {
    expect(
      isDashboardPeriodQueryable(
        parseLocalDateKey("2026-09-01"),
        parseLocalDateKey("2026-09-26"),
        today,
      ),
    ).toBe(false);
    expect(
      isDashboardPeriodQueryable(
        parseLocalDateKey("2026-09-26"),
        parseLocalDateKey("2026-09-30"),
        today,
      ),
    ).toBe(false);
  });
});

describe("resolveDashboardRangeChange", () => {
  const today = parseLocalDateKey("2026-09-25");

  it("오늘까지의 기간은 반영한다", () => {
    expect(
      resolveDashboardRangeChange(
        parseLocalDateKey("2026-09-01"),
        parseLocalDateKey("2026-09-25"),
        today,
      ),
    ).toEqual({ action: "commit" });
  });

  it("미래가 섞인 기간은 92일을 넘어도 토스트 없이 무시한다", () => {
    expect(
      resolveDashboardRangeChange(
        parseLocalDateKey("2026-09-01"),
        parseLocalDateKey("2026-12-31"),
        today,
      ),
    ).toEqual({ action: "ignore" });
  });

  it("과거 구간이 92일을 넘으면 상한 초과로 거절한다", () => {
    expect(
      resolveDashboardRangeChange(
        parseLocalDateKey("2026-01-01"),
        parseLocalDateKey("2026-04-03"),
        today,
      ),
    ).toEqual({ action: "reject-too-long" });
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
    const today = parseLocalDateKey("2026-09-25");
    const start = parseLocalDateKey("2026-01-01");
    const beyond = parseLocalDateKey("2026-04-03");
    expect(resolveDashboardCalendarClick(start, beyond, 92, today)).toEqual({
      action: "ignore",
    });
  });

  it("오늘 이후 클릭은 시작일 선택 전에도 무시한다", () => {
    const today = parseLocalDateKey("2026-09-25");
    const tomorrow = parseLocalDateKey("2026-09-26");
    expect(resolveDashboardCalendarClick(null, tomorrow, 92, today)).toEqual({
      action: "ignore",
    });
    expect(
      resolveDashboardCalendarClick(
        parseLocalDateKey("2026-09-01"),
        tomorrow,
        92,
        today,
      ),
    ).toEqual({ action: "ignore" });
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

describe("resolveDashboardCalendarCancel", () => {
  it("시작일이 있으면 pending만 비운다", () => {
    expect(
      resolveDashboardCalendarCancel(parseLocalDateKey("2026-01-01")),
    ).toEqual({ action: "clear-pending" });
  });

  it("시작일이 없으면 아무것도 하지 않는다", () => {
    expect(resolveDashboardCalendarCancel(null)).toEqual({ action: "noop" });
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
