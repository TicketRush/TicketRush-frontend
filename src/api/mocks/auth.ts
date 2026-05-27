// Mock 인증
import { mockDelay, mockError } from "./_helpers";
import type {
  OauthLoginResponse,
  EmailLoginRequest,
  EmailLoginResponse,
  SocialOauthLoginRequest,
  TokenReissueResponse,
} from "@/types/domain/auth";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function mockSocialLogin(
  req: SocialOauthLoginRequest,
): Promise<OauthLoginResponse> {
  await mockDelay(500);

  return {
    userId: 1,
    name: `${req.provider}_TestUser`,
    isNewUser: false,
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}

export async function mockEmailLogin(
  req: EmailLoginRequest,
): Promise<EmailLoginResponse> {
  await mockDelay(500);

  // 실패 케이스 테스트용 — fail@test.com / password 외
  if (req.email === "fail@test.com") {
    await mockError(
      "AUTH_LOGIN_FAILED",
      "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
  }

  return {
    userId: 1,
    name: req.email.split("@")[0],
    isNewUser: false,
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}

export async function mockOauthUrl(provider: string): Promise<string> {
  await mockDelay(200);
  return `https://mock-oauth.example.com/${provider}?client_id=mock&redirect_uri=http://localhost:5173/oauth/callback`;
}

export async function mockLogout(): Promise<void> {
  await mockDelay(200);
}

export async function mockReissue(): Promise<TokenReissueResponse> {
  await mockDelay(300);
  return {
    accessToken: `mock-access-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    accessTokenExpiresIn: ONE_HOUR_MS,
    refreshTokenExpiresIn: ONE_WEEK_MS,
  };
}
