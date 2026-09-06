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
