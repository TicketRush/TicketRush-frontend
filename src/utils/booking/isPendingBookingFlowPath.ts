/**
 * 예매 확인/결제/결제실패 화면 — 타이머와 결제를 이 페이지들이 직접 다룬다.
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
 * 이 경로에서는 레이아웃이 만료 취소·이어가기 배너를 띄우지 않는다.
 * 확인/결제는 페이지가 타이머를 복원하고, 좌석은 재진입 시 PENDING을 정리한다.
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
