import { formatSeoulDateTime } from "@/utils/datetime/formatSeoulInstant";

export const UNAVAILABLE_METRIC = "-";

export function formatAdminText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNAVAILABLE_METRIC;
}

/** BE Instant(UTC naive / ISO) → Asia/Seoul `YYYY-MM-DD HH:mm`. */
export function formatAdminDateTime(value: string | null | undefined): string {
  return formatSeoulDateTime(value, UNAVAILABLE_METRIC);
}

/** 예매자 이름·이메일 조합. 둘 다 없으면 undefined(화면에서 "-"). */
export function formatAdminBooker(
  name?: string | null,
  email?: string | null,
): string | undefined {
  const n = name?.trim();
  const e = email?.trim();
  if (n && e) return `${n} (${e})`;
  if (n) return n;
  if (e) return e;
  return undefined;
}

export function formatAdminCount(value: number | null | undefined): string {
  return value == null ? UNAVAILABLE_METRIC : value.toLocaleString();
}

export function formatAdminWon(value: number | null | undefined): string {
  return value == null ? UNAVAILABLE_METRIC : `₩${value.toLocaleString()}`;
}

export function formatAdminOccupancy(rate: number | null | undefined): string {
  return rate == null ? UNAVAILABLE_METRIC : `${(rate * 100).toFixed(0)}%`;
}

export function formatAdminSeats(
  sold: number | null | undefined,
  total: number | null | undefined,
): string {
  if (sold == null || total == null) return UNAVAILABLE_METRIC;
  return `${sold}/${total}`;
}

/** `showDate` + optional `showTime` (HH:mm:ss → HH:mm). */
export function formatAdminShowSchedule(
  date: string,
  showTime?: string,
): string {
  if (!showTime) return date;
  return `${date} ${showTime.slice(0, 5)}`;
}
