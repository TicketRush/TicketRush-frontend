// Mock 인증
//
// 백엔드 auth-service, user-service swagger (2026-07-02) 스펙 반영.
//
// 주요 변경 (신규 추가):
//   - mockEmailAuthSend (회원가입 이메일 인증 코드 발송)
//   - mockEmailAuthVerify (인증 코드 확인)
//   - mockEmailAuthConsume (인증 상태 소비)
//   - mockSignup (회원가입)
//   - mockCheckEmail (이메일 중복 확인)
//   - mockDevAuthToken (Dev Auth 토큰 발급)
//   - mockGetMe (내 정보 조회)
//   - mockGetOauthUrl (OAuth URL 조회 - 기존 mockOauthUrl 리팩터링)

import { mockDelay, mockError } from "./_helpers";
import type {
  OauthLoginResponse,
  OauthUrlResponse,
  EmailLoginRequest,
  EmailLoginResponse,
  SocialOauthLoginRequest,
  TokenReissueResponse,
  EmailAuthSendRequest,
  EmailAuthVerifyRequest,
  EmailAuthConsumeRequest,
  SignupRequest,
  SignupResponse,
  EmailCheckResponse,
  DevAuthTokenRequest,
  DevAuthTokenResponse,
  MeResponse,
  UserRole,
} from "@/types/domain/auth";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ── 소셜 로그인 ───────────────────────────────────────
export async function mockSocialLogin(
  req: SocialOauthLoginRequest,
): Promise<OauthLoginResponse> {
  await mockDelay(500);

  return {
    userId: 1,
    name: `${req.provider}_TestUser`,
    email: `${req.provider.toLowerCase()}_user@example.com`,
    role: "USER",
    joinedAt: "2025-01-15T00:00:00",
    isNewUser: false,
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}

// ── 이메일 로그인 ─────────────────────────────────────
export async function mockEmailLogin(
  req: EmailLoginRequest,
): Promise<EmailLoginResponse> {
  await mockDelay(500);

  // 실패 케이스 테스트용
  if (req.email === "fail@test.com") {
    await mockError(
      "AUTH_LOGIN_FAILED",
      "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
  }

  // 관리자 테스트용
  const role: UserRole =
    req.email === "admin@ticketrush.com" ? "ADMIN" : "USER";

  return {
    userId: 1,
    name: req.email.split("@")[0],
    email: req.email,
    role,
    joinedAt: "2025-01-15T00:00:00",
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}

// ── OAuth URL 조회 ────────────────────────────────────
export async function mockGetOauthUrl(
  provider: string,
): Promise<OauthUrlResponse> {
  await mockDelay(200);
  return {
    url: `https://mock-oauth.example.com/${provider}?client_id=mock&redirect_uri=http://localhost:5173/auth/callback/${provider}`,
  };
}

// ── 로그아웃 ──────────────────────────────────────────
export async function mockLogout(): Promise<void> {
  await mockDelay(200);
}

// ── 토큰 재발급 ───────────────────────────────────────
export async function mockReissue(): Promise<TokenReissueResponse> {
  await mockDelay(300);
  return {
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}

// ── 회원가입 이메일 인증 3단계 (신규) ──────────────────
/** 1단계 — 인증 코드 발송 */
export async function mockEmailAuthSend(
  _req: EmailAuthSendRequest,
): Promise<{ sent: boolean }> {
  await mockDelay(500);
  // mock에선 무조건 성공. 실제로는 SMTP로 이메일 발송.
  return { sent: true };
}

/** 2단계 — 인증 코드 확인 */
export async function mockEmailAuthVerify(
  req: EmailAuthVerifyRequest,
): Promise<{ verified: boolean }> {
  await mockDelay(400);
  // mock: 인증 코드가 "123456"이면 성공, 아니면 실패
  if (req.authNumber !== "123456") {
    await mockError("AUTH_CODE_INVALID", "인증 코드가 일치하지 않습니다.");
  }
  return { verified: true };
}

/** 3단계 — 인증 상태 소비 (회원가입 직전) */
export async function mockEmailAuthConsume(
  _req: EmailAuthConsumeRequest,
): Promise<void> {
  await mockDelay(200);
  // mock에선 noop
}

// ── 회원가입 (신규) ───────────────────────────────────
export async function mockSignup(req: SignupRequest): Promise<SignupResponse> {
  await mockDelay(700);

  // 이메일 중복 체크
  if (req.email === "exists@test.com") {
    await mockError("USER_EMAIL_DUPLICATED", "이미 사용 중인 이메일입니다.");
  }

  // 비밀번호 확인 매칭
  if (req.password !== req.passwordConfirm) {
    await mockError("USER_PASSWORD_MISMATCH", "비밀번호가 일치하지 않습니다.");
  }

  return {
    userId: Date.now(),
    email: req.email,
    name: req.name,
  };
}

// ── 이메일 중복 확인 (신규) ───────────────────────────
export async function mockCheckEmail(
  email: string,
): Promise<EmailCheckResponse> {
  await mockDelay(300);
  return {
    isDuplicated: email === "exists@test.com",
  };
}

// ── Dev Auth 토큰 발급 (신규 — 개발 편의용) ───────────
export async function mockDevAuthToken(
  _req: DevAuthTokenRequest,
): Promise<DevAuthTokenResponse> {
  await mockDelay(300);
  return {
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}

// ── 내 정보 조회 (신규) ───────────────────────────────
export async function mockGetMe(): Promise<MeResponse> {
  await mockDelay(300);
  return {
    userId: 1,
    email: "user@example.com",
    name: "김철수",
    joinedAt: "2025-01-15T00:00:00",
    role: "USER", // ⚠️ 백엔드 실제 응답엔 없음. 추가 요청 필요
  };
}
