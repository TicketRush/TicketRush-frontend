import type { DailyRevenue } from "@/types/domain/admin";

/** BE 기본: 오늘 포함 최근 30일 (`PerformanceGetAdminDashboardUseCase`). */
export const DEFAULT_DASHBOARD_PERIOD_DAYS = 30;

/** BE 상한: 포함 일수 92일. 93일 이상은 `PERFORMANCE_400_009`. */
export const MAX_DASHBOARD_PERIOD_DAYS = 92;

const MS_PER_DAY = 86_400_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function defaultDashboardRange(today = new Date()): {
  start: Date;
  end: Date;
} {
  const end = startOfDay(today);
  const start = startOfDay(today);
  start.setDate(start.getDate() - (DEFAULT_DASHBOARD_PERIOD_DAYS - 1));
  return { start, end };
}

/**
 * 대시보드 달력의 초기 표시 월.
 * 조회 시작일(최근 30일이면 이전달일 수 있음)이 아니라 종료일(기본값: 오늘)을 보여 준다.
 */
export function dashboardCalendarView({
  end,
}: {
  start: Date;
  end: Date;
}): { year: number; month: number } {
  const view = startOfDay(end);
  return { year: view.getFullYear(), month: view.getMonth() };
}

/** 시작·종료일 포함 일수. BE `ChronoUnit.DAYS.between(from, to) + 1` 과 동일. */
export function inclusiveDayCount(start: Date, end: Date): number {
  return (
    Math.round(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) / MS_PER_DAY,
    ) + 1
  );
}

export function isDashboardPeriodWithinLimit(
  start: Date,
  end: Date,
): boolean {
  const from = startOfDay(start);
  const to = startOfDay(end);
  if (from.getTime() > to.getTime()) return false;
  return inclusiveDayCount(from, to) <= MAX_DASHBOARD_PERIOD_DAYS;
}

function orderedDays(a: Date, b: Date): { start: Date; end: Date } {
  return a.getTime() <= b.getTime()
    ? { start: a, end: b }
    : { start: b, end: a };
}

/**
 * 시작일을 고른 뒤, 포함 일수가 상한을 넘는 끝점인지.
 * pendingStart가 없으면 92일 비활성만 없다. 오늘 이후를 켜는 판정은 아니다.
 */
export function isDashboardCalendarDateDisabled(
  pendingStart: Date | null,
  date: Date,
  maxInclusiveDays = MAX_DASHBOARD_PERIOD_DAYS,
): boolean {
  if (!pendingStart) return false;
  const { start, end } = orderedDays(pendingStart, date);
  return inclusiveDayCount(start, end) > maxInclusiveDays;
}

export type DashboardCalendarClick =
  | { action: "set-start"; date: Date }
  | { action: "confirm"; start: Date; end: Date }
  | { action: "ignore" };

/**
 * 달력 날짜 클릭 결과.
 * 상한을 넘는 날짜는 시작일(pendingStart)과 조회 기간을 그대로 둔다.
 */
export function resolveDashboardCalendarClick(
  pendingStart: Date | null,
  clicked: Date,
  maxInclusiveDays = MAX_DASHBOARD_PERIOD_DAYS,
): DashboardCalendarClick {
  if (
    isDashboardCalendarDateDisabled(pendingStart, clicked, maxInclusiveDays)
  ) {
    return { action: "ignore" };
  }
  if (!pendingStart) {
    return { action: "set-start", date: clicked };
  }
  const { start, end } = orderedDays(pendingStart, clicked);
  return { action: "confirm", start, end };
}

export type DashboardCalendarCancel =
  | { action: "clear-pending" }
  | { action: "noop" };

/**
 * 기간 선택 취소. 날짜 클릭이 아니므로 ignore·confirm과 섞지 않는다.
 * pendingStart만 비운다. 조회 기간과 보고 있는 달은 바꾸지 않는다.
 */
export function resolveDashboardCalendarCancel(
  pendingStart: Date | null,
): DashboardCalendarCancel {
  if (!pendingStart) return { action: "noop" };
  return { action: "clear-pending" };
}

export function fillDailyRevenueGaps(
  rows: DailyRevenue[],
  from: string,
  to: string,
): DailyRevenue[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const filled: DailyRevenue[] = [];
  const cursor = parseLocalDateKey(from);
  const last = parseLocalDateKey(to);

  while (cursor.getTime() <= last.getTime()) {
    const key = toLocalDateKey(cursor);
    filled.push(byDate.get(key) ?? { date: key, revenue: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return filled;
}
