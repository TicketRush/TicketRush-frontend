export const UNAVAILABLE_METRIC = "-";

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
