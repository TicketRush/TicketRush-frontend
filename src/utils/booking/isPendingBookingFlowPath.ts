/**
 * 예매 확인/결제/결제실패 화면 — 이탈 시 PENDING을 취소해야 하는 경로 (#167).
 * 결제 성공 확인·만료 페이지는 제외한다.
 */
export function isPendingBookingFlowPath(pathname: string): boolean {
  return (
    /\/concerts\/[^/]+\/payment\/confirm\/?$/.test(pathname) ||
    /\/concerts\/[^/]+\/payment\/failed\/?$/.test(pathname) ||
    /\/concerts\/[^/]+\/payment\/?$/.test(pathname)
  );
}

/**
 * 이 경로에서는 sessionStorage의 PENDING을 유지한다.
 * 좌석은 「좌석 확인」직후 bookingNumber가 생긴 채 잠시 머물 수 있어 제외한다.
 * 로그인·가입·OAuth는 레이아웃 밖이지만, 세션이 끊겨도 결제를 이어갈 수 있게 유지한다.
 */
export function shouldKeepPendingOnPath(pathname: string): boolean {
  if (isPendingBookingFlowPath(pathname)) return true;
  return (
    /\/concerts\/[^/]+\/payment\/success\/?$/.test(pathname) ||
    /\/concerts\/[^/]+\/payment\/expired\/?$/.test(pathname) ||
    /\/concerts\/[^/]+\/seats\/?$/.test(pathname) ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/") ||
    pathname.startsWith("/oauth/callback")
  );
}
