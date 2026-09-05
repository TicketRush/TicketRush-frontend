/**
 * 백엔드 LocalDateTime JSON (`yyyy-MM-dd HH:mm:ss`, 오프셋 없음)을 epoch ms로 파싱한다.
 * ISO(`T` / `Z`)도 허용한다. 오프셋이 없으면 브라우저 로컬 벽시계로 해석한다.
 */
export function parseBackendDateTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const naive = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (naive && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const [, y, mo, d, h, mi, s] = naive;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    ).getTime();
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
