// 저장된 로그인 상태를 되살릴 수 있는지 판단 (이슈 #326)
//
// authStore는 토큰을 localStorage에 persist한다. 그래서 서버 재시작이나 장기
// 미접속으로 토큰이 죽어도 앱은 "로그인 상태"로 부팅한다(헤더에 로그아웃 버튼이
// 보이고, 모든 인증 요청은 실패한다). 재수화 직후 이 함수로 판단해 정리한다.

import { isJwtExpired } from "./jwt";

export interface StoredAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  user?: unknown;
}

/**
 * 저장된 토큰을 비워야 하는지.
 *
 * 만료가 확실할 때만 true다. exp를 읽을 수 없는 토큰(mock 토큰 등)은
 * 판단 근거가 없으므로 유지한다 — isJwtExpired 참고.
 */
export function shouldClearStoredAuth(
  { accessToken, refreshToken }: StoredAuthTokens,
  now: number = Date.now(),
): boolean {
  // 이미 비로그인이면 지울 것도 없다
  if (!accessToken && !refreshToken) return false;

  // refresh 토큰이 살아 있으면 access 만료는 인터셉터가 재발급으로 해결한다
  if (refreshToken && !isJwtExpired(refreshToken, now)) return false;

  // 재발급으로 되살릴 수 없다 → access 토큰이 아직 쓸 수 있을 때만 유지
  return !accessToken || isJwtExpired(accessToken, now);
}

/**
 * persist merge용. 만료가 확실하면 토큰과 user를 함께 비운다.
 * user만 남기면 헤더는 비로그인인데 마이페이지가 이름을 그리는 어긋남이 생긴다.
 */
export function clearExpiredStoredAuth<T extends StoredAuthTokens>(
  persisted: T,
  now: number = Date.now(),
): T {
  if (!shouldClearStoredAuth(persisted, now)) return persisted;
  return { ...persisted, accessToken: null, refreshToken: null, user: null };
}
