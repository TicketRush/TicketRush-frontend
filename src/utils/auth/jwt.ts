// JWT payload의 exp만 읽는 최소 구현 (이슈 #326)
//
// 서명 검증은 서버 몫이다. 프론트는 "이미 만료된 게 확실한 토큰"을 들고
// 로그인 상태인 척하지 않기 위한 판단만 한다.

/** base64url payload → 객체. 해석 불가면 null */
function decodePayload(token: string): Record<string, unknown> | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // JWT가 아닌 문자열(mock 토큰 등)이면 여기로 온다
    return null;
  }
}

/** 만료 시각(ms). JWT가 아니거나 exp가 없으면 null */
export function readJwtExpiry(
  token: string | null | undefined,
): number | null {
  if (!token) return null;

  const exp = decodePayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
}

/**
 * 이미 만료된 JWT인지.
 *
 * JWT가 아니거나 exp가 없으면 false다. 판단 근거가 없을 때 만료로 취급하면
 * mock 토큰("mock-access-...")처럼 정상 동작하던 흐름까지 끊는다.
 */
export function isJwtExpired(
  token: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const expiresAt = readJwtExpiry(token);
  if (expiresAt === null) return false;

  return expiresAt <= now;
}
