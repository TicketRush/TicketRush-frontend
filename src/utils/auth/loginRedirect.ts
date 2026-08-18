// 로그인/회원가입 성공 후 원래 가려던 경로로 복귀시키기 위한 유틸 (#101)
//
// location.state 만으로는 부족한 이유:
//   소셜 로그인은 외부 IdP로 전체 페이지 이동이 일어나 SPA 메모리와 함께
//   router state가 사라진다. 또 회원가입 → 로그인으로 넘어가는 동안에도
//   state를 계속 넘겨야 해서 누락되기 쉽다.
//   그래서 복귀 경로는 sessionStorage에 보관한다.

import type { UserRole } from "@/types/domain/auth";

const REDIRECT_KEY = "ticketrush:loginRedirect";

export type LoginLocationState = {
  from?: unknown;
  /** 가입 직후 /login 재진입처럼, 쿼리 없이 와도 저장값을 유지해야 할 때 */
  preserveRedirect?: boolean;
};

function pathnameOnly(path: string): string {
  const end = path.search(/[?#]/);
  return end === -1 ? path : path.slice(0, end);
}

/**
 * 오픈 리다이렉트 방지 — 같은 오리진의 절대 경로만 허용한다.
 * `//evil.com`, `/\evil.com` 은 브라우저가 외부 주소로 해석할 수 있어 차단한다.
 */
function sanitize(path: string): string | null {
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//") || path.startsWith("/\\")) return null;

  const pathname = pathnameOnly(path);
  // 인증 페이지로 되돌아가 무한 순환하는 것을 막는다
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/")
  ) {
    return null;
  }
  return path;
}

/** router의 `state.from`(Location 객체 또는 문자열)에서 내부 경로만 추출 */
export function toInternalPath(from: unknown): string | null {
  if (typeof from === "string") return sanitize(from);

  if (from && typeof from === "object") {
    const { pathname, search, hash } = from as Record<string, unknown>;
    if (typeof pathname !== "string") return null;
    const query = typeof search === "string" ? search : "";
    const fragment = typeof hash === "string" ? hash : "";
    return sanitize(`${pathname}${query}${fragment}`);
  }

  return null;
}

/** 유효한 경로일 때만 저장한다. 값이 없으면 기존 저장값을 유지한다. */
export function saveLoginRedirect(from: unknown): void {
  const path = toInternalPath(from);
  if (!path) return;

  try {
    sessionStorage.setItem(REDIRECT_KEY, path);
  } catch {
    // 스토리지 접근이 막힌 환경에서도 로그인 자체는 진행되어야 한다
  }
}

/** 헤더에서 직접 로그인하는 등, 예매 흐름이 아닌 진입에서 남은 경로를 지운다 */
export function clearLoginRedirect(): void {
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    // ignore
  }
}

/**
 * 로그인 페이지 진입 시 복귀 경로를 맞춘다.
 * - from이 있으면 저장
 * - preserveRedirect면 기존 저장값을 유지 (가입 후 /login 복귀)
 * - 둘 다 없으면 비움 (이전에 예매하기를 눌렀다가 포기한 경로가 남는 것 방지)
 */
export function applyLoginRedirectFromLocation(state: unknown): void {
  const s =
    state && typeof state === "object"
      ? (state as LoginLocationState)
      : null;

  if (toInternalPath(s?.from)) {
    saveLoginRedirect(s?.from);
    return;
  }
  if (s?.preserveRedirect) return;
  clearLoginRedirect();
}

/** 저장된 복귀 경로를 꺼내고 비운다. 없으면 null */
export function consumeLoginRedirect(): string | null {
  try {
    const stored = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return stored ? toInternalPath(stored) : null;
  } catch {
    return null;
  }
}

/**
 * 관리자는 팀 규칙상 복귀 경로와 무관하게 항상 /admin.
 * 보관값은 관리자여도 꺼내서 비운다.
 * allowRedirect가 false면 회원도 복귀하지 않는다 (/me 실패 등 role 미확정).
 */
export function resolveLandingPath(
  role: UserRole,
  options?: { allowRedirect?: boolean },
): string {
  const redirect = consumeLoginRedirect();
  if (role === "ADMIN") return "/admin";
  if (options?.allowRedirect === false) return "/";
  return redirect ?? "/";
}
