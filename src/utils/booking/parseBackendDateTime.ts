import { formatSeoulLocaleString } from "@/utils/datetime/formatSeoulInstant";

/**
 * 백엔드 Instant JSON을 epoch ms로 파싱한다.
 *
 * - offset/Z 있는 ISO → Instant
 * - 오프셋 없는 naive (`yyyy-MM-dd HH:mm:ss` / `T` 구분) → **UTC Instant**
 *   (브라우저 로컬 벽시계로 해석하지 않음 — #246)
 */
export function parseBackendDateTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const naive = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (naive && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const [, y, mo, d, h, mi, s] = naive;
    return Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
  }

  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

export function remainingMsUntil(
  expiresAt: string,
  nowMs: number = Date.now(),
): number {
  const t = parseBackendDateTime(expiresAt);
  if (t == null) return 0;
  return Math.max(0, t - nowMs);
}

/** BE Instant → Asia/Seoul 표기. `formatSeoulLocaleString` 별칭 (#246) */
export function formatBackendDateTimeLabel(
  value: string | null | undefined,
): string {
  return formatSeoulLocaleString(value);
}
