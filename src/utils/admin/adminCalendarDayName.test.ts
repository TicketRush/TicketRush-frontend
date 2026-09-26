import { describe, expect, it } from "vitest";
import { formatAdminCalendarDayName } from "./adminCalendarDayName";
import {
  dashboardCalendarDisabledTitle,
  parseLocalDateKey,
} from "./dashboardPeriod";

const day = parseLocalDateKey("2026-09-22");

describe("formatAdminCalendarDayName", () => {
  it("연·월·일·요일을 한국어로 읽는다", () => {
    expect(formatAdminCalendarDayName(day)).toBe("2026년 9월 22일 화요일");
  });

  it("오늘, 확정된 시작·종료, 기간 안, 선택 불가를 이름에 붙인다", () => {
    const overMax = dashboardCalendarDisabledTitle("over-max");

    expect(formatAdminCalendarDayName(day, { isToday: true })).toBe(
      "2026년 9월 22일 화요일, 오늘",
    );
    expect(formatAdminCalendarDayName(day, { isRangeStart: true })).toBe(
      "2026년 9월 22일 화요일, 시작일",
    );
    expect(formatAdminCalendarDayName(day, { isRangeEnd: true })).toBe(
      "2026년 9월 22일 화요일, 종료일",
    );
    expect(
      formatAdminCalendarDayName(day, { isRangeStart: true, isRangeEnd: true }),
    ).toBe("2026년 9월 22일 화요일, 시작일과 종료일");
    expect(formatAdminCalendarDayName(day, { isInRange: true })).toBe(
      "2026년 9월 22일 화요일, 선택한 기간",
    );
    expect(formatAdminCalendarDayName(day, { disabledTitle: overMax })).toBe(
      `2026년 9월 22일 화요일, 선택 불가, ${overMax}`,
    );
  });

  it("시작일만 고른 칸은 하루 기간으로 읽지 않는다", () => {
    expect(
      formatAdminCalendarDayName(day, {
        isPendingStart: true,
        isRangeStart: true,
        isRangeEnd: true,
        isInRange: true,
      }),
    ).toBe("2026년 9월 22일 화요일, 시작일");
  });

  it("오늘이면서 종료일이면 상태를 함께 읽는다", () => {
    expect(
      formatAdminCalendarDayName(parseLocalDateKey("2026-09-01"), {
        isToday: true,
        isRangeEnd: true,
      }),
    ).toBe("2026년 9월 1일 화요일, 오늘, 종료일");
  });
});
