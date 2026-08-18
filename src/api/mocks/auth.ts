// Mock 인증
//
// 백엔드 auth-service, user-service 스펙 반영 (2026-07-19 백엔드 코드 직접 확인)
//
// 주요 변경:
//   - mockSocialLogin: email/role/joinedAt 제거 (실 응답에 없음)
//   - mockEmailLogin: role MEMBER|ADMIN (/me·로그인 응답 동일)
//   - mockEmailAuthConsume 제거 (해당 엔드포인트 존재하지 않음)
//   - mockCheckEmail: isDuplicated → exists
//   - mockGetMe: name/email/createdAt/role 반환 (#137)
//   - mockDevAuthToken: LoginResponse와 동일 구조로 정정

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

/** mockGetMe가 로그인 세션 role을 반영하도록 보관 (DB/me = MEMBER|ADMIN) */
let mockSessionRole: UserRole = "MEMBER";
let mockSessionEmail = "user@example.com";
let mockSessionName = "김철수";

// ── 소셜 로그인 ───────────────────────────────────────
export async function mockSocialLogin(
  req: SocialOauthLoginRequest,
): Promise<OauthLoginResponse> {
  await mockDelay(500);

  mockSessionRole = "MEMBER";
  mockSessionName = `${req.provider}_TestUser`;
  mockSessionEmail = `${req.provider.toLowerCase()}_user@example.com`;

  return {
    userId: 1,
    name: mockSessionName,
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

  const isAdmin = req.email === "admin@ticketrush.com";
  mockSessionRole = isAdmin ? "ADMIN" : "MEMBER";
  mockSessionEmail = req.email;
  mockSessionName = isAdmin ? "관리자" : "김철수";

  return {
    userId: 1,
    email: req.email,
    role: mockSessionRole,
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
  };
}

// ── OAuth URL 조회 ────────────────────────────────────
export async function mockGetOauthUrl(
  provider: string,
): Promise<OauthUrlResponse> {
  await mockDelay(200);
  return {
    url: `https://mock-oauth.example.com/${provider}?client_id=mock&redirect_uri=http://localhost:5173/oauth/callback/${provider}`,
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

// ── 회원가입 이메일 인증 2단계 ──────────────────────
/** 1단계 — 인증 코드 발송 */
export async function mockEmailAuthSend(
  req: EmailAuthSendRequest,
): Promise<{ sent: boolean }> {
  await mockDelay(500);
  // 이미 가입된 이메일 테스트용 (실 백엔드: AUTH_EMAIL_ALREADY_EXISTS)
  if (req.email === "exists@test.com") {
    await mockError("AUTH_400_007", "이미 가입된 이메일입니다.");
  }
  return { sent: true };
}

/** 2단계 — 인증 코드 확인 */
export async function mockEmailAuthVerify(
  req: EmailAuthVerifyRequest,
): Promise<{ verified: boolean }> {
  await mockDelay(400);
  // mock: 인증 코드가 "123456"이면 성공, 아니면 실패
  if (req.authNumber !== "123456") {
    await mockError("AUTH_400_010", "인증번호가 일치하지 않습니다.");
  }
  return { verified: true };
}

// ── 회원가입 ───────────────────────────────────────────
export async function mockSignup(req: SignupRequest): Promise<SignupResponse> {
  await mockDelay(700);

  // 이메일 중복 체크 (실 백엔드: USER_EMAIL_ALREADY_EXISTS)
  if (req.email === "exists@test.com") {
    await mockError("USER_400_008", "이미 가입된 이메일입니다.");
  }

  // 비밀번호 확인 매칭
  if (req.password !== req.passwordConfirm) {
    await mockError("USER_400_006", "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
  }

  return {
    userId: Date.now(),
    email: req.email,
    name: req.name,
  };
}

// ── 이메일 중복 확인 ──────────────────────────────────
export async function mockCheckEmail(
  email: string,
): Promise<EmailCheckResponse> {
  await mockDelay(300);
  return {
    exists: email === "exists@test.com",
  };
}

// ── Dev Auth 토큰 발급 (개발 편의용) ───────────────────
export async function mockDevAuthToken(
  req: DevAuthTokenRequest,
): Promise<DevAuthTokenResponse> {
  await mockDelay(300);
  return {
    userId: req.userId,
    email: `dev-user-${req.userId}@example.com`,
    role: "MEMBER",
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
  };
}

// ── 내 정보 조회 ──────────────────────────────────────
export async function mockGetMe(): Promise<MeResponse> {
  await mockDelay(300);
  return {
    email: mockSessionEmail,
    name: mockSessionName,
    createdAt: "2025-01-15T00:00:00",
    role: mockSessionRole,
  };
}
