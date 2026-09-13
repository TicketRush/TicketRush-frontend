import { parseBackendDateTime } from "@/utils/booking/parseBackendDateTime";

/** Instant 화면 표시 기준 시간대 (#246) */
export const SEOUL_TIME_ZONE = "Asia/Seoul";

function getSeoulParts(
  ms: number,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    ...options,
  }).formatToParts(new Date(ms));

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return map;
}

function resolveMs(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  return parseBackendDateTime(trimmed);
}

/** Instant → `YYYY-MM-DD` (Asia/Seoul). 실패 시 fallback */
export function formatSeoulDate(
  value: string | number | null | undefined,
  fallback: string = "-",
): string {
  const ms = resolveMs(value);
  if (ms == null) return fallback;
  const p = getSeoulParts(ms, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  if (!p.year || !p.month || !p.day) return fallback;
  return `${p.year}-${p.month}-${p.day}`;
}

/** Instant → `YYYY-MM-DD HH:mm` (Asia/Seoul). 관리자·예매 카드용 */
export function formatSeoulDateTime(
  value: string | number | null | undefined,
  fallback: string = "-",
): string {
  const ms = resolveMs(value);
  if (ms == null) return fallback;
  const p = getSeoulParts(ms, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (!p.year || !p.month || !p.day || !p.hour || !p.minute) return fallback;
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}`;
}

/** Instant → `ko-KR` + Asia/Seoul 로케일 문자열 */
export function formatSeoulLocaleString(
  value: string | number | null | undefined,
  fallback: string = "-",
): string {
  const ms = resolveMs(value);
  if (ms == null) return fallback;
  return new Date(ms).toLocaleString("ko-KR", { timeZone: SEOUL_TIME_ZONE });
}
