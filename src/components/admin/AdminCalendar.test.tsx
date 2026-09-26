import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminCalendar from "./AdminCalendar";
import {
  defaultDashboardRange,
  inclusiveDayCount,
  parseLocalDateKey,
} from "@/utils/admin/dashboardPeriod";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("AdminCalendar", () => {
  it("첫 진입 시 기본 30일의 시작월이 아니라 당월을 보여 준다", () => {
    const range = defaultDashboardRange(parseLocalDateKey("2026-09-01"));
    const html = renderToStaticMarkup(
      <AdminCalendar selectedRange={range} onRangeChange={() => {}} />,
    );

    expect(html).toContain(">9월");
    expect(html).not.toContain(">8월");
    expect(html).toContain(">1<");
  });

  it("기본 30일 조회 기간을 유지하면서 오늘이 당월 그리드에 있다", () => {
    const today = new Date();
    const range = defaultDashboardRange(today);
    const html = renderToStaticMarkup(
      <AdminCalendar selectedRange={range} onRangeChange={() => {}} />,
    );

    expect(inclusiveDayCount(range.start, range.end)).toBe(30);
    expect(html).toContain(`>${today.getMonth() + 1}월`);
    expect(html).toContain(`>${today.getDate()}<`);
  });

  it("날짜 숫자는 그대로 두고 이름과 헤더에 연·월을 붙인다", () => {
    const html = renderToStaticMarkup(
      <AdminCalendar
        today={parseLocalDateKey("2026-09-22")}
        selectedRange={{
          start: parseLocalDateKey("2026-09-01"),
          end: parseLocalDateKey("2026-09-22"),
        }}
        onRangeChange={() => {}}
      />,
    );

    expect(html).toContain(">22<");
    expect(html).toContain('aria-label="2026년 9월 1일 화요일, 시작일"');
    expect(html).toContain(
      'aria-label="2026년 9월 10일 목요일, 선택한 기간"',
    );
    expect(html).toContain(
      'aria-label="2026년 9월 22일 화요일, 오늘, 종료일"',
    );
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="2026년 9월"');
    expect(html).toContain('aria-label="2026년"');
    expect(html).toContain(">9월");
    expect(html).toContain(">2026 ");
  });
});
