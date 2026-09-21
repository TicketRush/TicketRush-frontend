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
});
