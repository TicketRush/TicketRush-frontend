import { parseBackendDateTime } from "@/utils/booking/parseBackendDateTime";

export const UNAVAILABLE_METRIC = "-";

export function formatAdminText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNAVAILABLE_METRIC;
}

/** BE `yyyy-MM-dd HH:mm:ss` 또는 ISO → `YYYY-MM-DD HH:mm`. */
export function formatAdminDateTime(value: string | null | undefined): string {
  if (value == null || value.trim() === "") return UNAVAILABLE_METRIC;
  const ms = parseBackendDateTime(value);
  if (ms == null) return UNAVAILABLE_METRIC;
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
