// 인증/사용자 API — 백엔드 auth-service + user-service swagger (2026-07-02) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   ── auth-service ──
//   socialLoginApi              → POST /api/v1/auth/social/login
//   emailLoginApi               → POST /api/v1/auth/login
//   reissueTokenApi             → POST /api/v1/auth/reissue
//   logoutApi                   → POST /api/v1/auth/logout
//   getOauthUrlApi              → GET  /api/v1/auth/oauth/{provider}/url
//   sendEmailVerificationApi    → POST /api/v1/auth/signup/email-auth/send
//   verifyEmailCodeApi          → POST /api/v1/auth/signup/email-auth/verify
//   consumeEmailAuthApi         → POST /api/v1/auth/signup/email-auth/consume (신규)
//   devAuthTokenApi             → POST /api/v1/dev/auth/token (신규, 개발 편의용)
//   ── user-service ──
//   signupApi                   → POST /api/v1/user/signup
//   checkEmailApi               → GET  /api/v1/user/exists/email (신규)
//   getMeApi                    → GET  /api/v1/user/me (신규)

import apiClient from "./instance";
import type {
  SocialOauthLoginRequest,
  OauthLoginResponse,
  OauthUrlResponse,
  TokenReissueRequest,
  TokenReissueResponse,
  EmailLoginRequest,
  EmailLoginResponse,
  EmailAuthSendRequest,
  EmailAuthVerifyRequest,
  EmailAuthConsumeRequest,
  SignupRequest,
  SignupResponse,
  EmailCheckResponse,
  DevAuthTokenRequest,
  DevAuthTokenResponse,
  MeResponse,
} from "@/types/domain/auth";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// ── 소셜 로그인 ───────────────────────────────────────
export async function socialLoginApi(
  req: SocialOauthLoginRequest,
): Promise<OauthLoginResponse> {
  if (USE_MOCK) {
    const { mockSocialLogin } = await import("./mocks/auth");
    return mockSocialLogin(req);
  }
  const res = await apiClient.post<OauthLoginResponse>(
    "/api/v1/auth/social/login",
    req,
  );
  return res.data;
}

// ── 이메일 로그인 (백엔드 확정) ──────────────────────
export async function emailLoginApi(
  req: EmailLoginRequest,
): Promise<EmailLoginResponse> {
  if (USE_MOCK) {
    const { mockEmailLogin } = await import("./mocks/auth");
    return mockEmailLogin(req);
  }
  const res = await apiClient.post<EmailLoginResponse>(
    "/api/v1/auth/login",
    req,
  );
  return res.data;
}

// ── 토큰 재발급 ───────────────────────────────────────
export async function reissueTokenApi(
  req: TokenReissueRequest,
): Promise<TokenReissueResponse> {
  if (USE_MOCK) {
    const { mockReissue } = await import("./mocks/auth");
    return mockReissue();
  }
  const res = await apiClient.post<TokenReissueResponse>(
    "/api/v1/auth/reissue",
    req,
  );
  return res.data;
}

// ── OAuth URL 조회 ────────────────────────────────────
/**
 * OAuth 로그인 URL 조회.
 *
 * 백엔드 응답: result가 string (URL 문자열).
 * 프론트 관점: OauthUrlResponse ({ url: string }) 객체로 감싸서 반환 (사용 편의).
 */
export async function getOauthUrlApi(
  provider: string,
): Promise<OauthUrlResponse> {
  if (USE_MOCK) {
    const { mockGetOauthUrl } = await import("./mocks/auth");
    return mockGetOauthUrl(provider);
  }
  const res = await apiClient.get<string>(`/api/v1/auth/oauth/${provider}/url`);
  return { url: res.data };
}

// ── 로그아웃 ──────────────────────────────────────────
export async function logoutApi(): Promise<void> {
  if (USE_MOCK) {
    const { mockLogout } = await import("./mocks/auth");
    return mockLogout();
  }
  await apiClient.post("/api/v1/auth/logout");
}

// ── 회원가입 이메일 인증 3단계 (백엔드 확정) ──────────

/**
 * 1단계 — 이메일에 인증 코드 발송.
 * 백엔드: POST /api/v1/auth/signup/email-auth/send
 *
 * 함수 이름은 기존 유지 (SignupPage 참조 호환).
 */
export async function sendEmailVerificationApi(email: string): Promise<void> {
  const req: EmailAuthSendRequest = { email };
  if (USE_MOCK) {
    const { mockEmailAuthSend } = await import("./mocks/auth");
    await mockEmailAuthSend(req);
    return;
  }
  await apiClient.post("/api/v1/auth/signup/email-auth/send", req);
}

/**
 * 2단계 — 인증 코드 확인.
 * 백엔드: POST /api/v1/auth/signup/email-auth/verify
 *
 * 백엔드 필드명은 authNumber이지만, 프론트 함수 파라미터는 code로 유지 (호출부 호환).
 */
export async function verifyEmailCodeApi(
  email: string,
  code: string,
): Promise<void> {
  const req: EmailAuthVerifyRequest = { email, authNumber: code };
  if (USE_MOCK) {
    const { mockEmailAuthVerify } = await import("./mocks/auth");
    await mockEmailAuthVerify(req);
    return;
  }
  await apiClient.post("/api/v1/auth/signup/email-auth/verify", req);
}

/**
 * 3단계 (신규) — 인증 상태 소비 (회원가입 직전).
 * 백엔드: POST /api/v1/auth/signup/email-auth/consume
 *
 * signupApi 호출 직전에 반드시 호출해야 함.
 */
export async function consumeEmailAuthApi(email: string): Promise<void> {
  const req: EmailAuthConsumeRequest = { email };
  if (USE_MOCK) {
    const { mockEmailAuthConsume } = await import("./mocks/auth");
    await mockEmailAuthConsume(req);
    return;
  }
  await apiClient.post("/api/v1/auth/signup/email-auth/consume", req);
}

// ── 회원가입 (user-service) ──────────────────────────
/**
 * 회원가입.
 * 백엔드: POST /api/v1/user/signup
 *
 * 기존 시그니처: { name, email, password }
 * 새 시그니처: { name, email, password, passwordConfirm } (SignupRequest 타입 사용)
 */
export async function signupApi(req: SignupRequest): Promise<SignupResponse> {
  if (USE_MOCK) {
    const { mockSignup } = await import("./mocks/auth");
    return mockSignup(req);
  }
  const res = await apiClient.post<SignupResponse>("/api/v1/user/signup", req);
  return res.data;
}

// ── 이메일 중복 확인 (신규) ───────────────────────────
export async function checkEmailApi(
  email: string,
): Promise<EmailCheckResponse> {
  if (USE_MOCK) {
    const { mockCheckEmail } = await import("./mocks/auth");
    return mockCheckEmail(email);
  }
  const res = await apiClient.get<EmailCheckResponse>(
    "/api/v1/user/exists/email",
    { params: { email } },
  );
  return res.data;
}

// ── Dev Auth 토큰 (신규 — 개발 편의용) ────────────────
/**
 * userId로 즉시 토큰 발급.
 *
 * DevNavPage 등 개발 전용 UI에서 소셜/이메일 로그인 우회할 때 사용.
 * ⚠️ 운영에서는 비활성화되어야 함.
 */
export async function devAuthTokenApi(
  req: DevAuthTokenRequest,
): Promise<DevAuthTokenResponse> {
  if (USE_MOCK) {
    const { mockDevAuthToken } = await import("./mocks/auth");
    return mockDevAuthToken(req);
  }
  const res = await apiClient.post<DevAuthTokenResponse>(
    "/api/v1/dev/auth/token",
    req,
  );
  return res.data;
}

// ── 내 정보 (신규) ────────────────────────────────────
/**
 * 로그인한 사용자 정보 조회.
 * 백엔드: GET /api/v1/user/me
 *
 * ⚠️ 백엔드 응답에 role 필드 없음
 * 관리자 페이지 접근 판단은 로그인 응답의 role을 authStore에 저장하고 그걸 사용.
 */
export async function getMeApi(): Promise<MeResponse> {
  if (USE_MOCK) {
    const { mockGetMe } = await import("./mocks/auth");
    return mockGetMe();
  }
  const res = await apiClient.get<MeResponse>("/api/v1/user/me");
  return res.data;
}
