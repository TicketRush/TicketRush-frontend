// 인증/유저 도메인 타입
// swagger 확정: SocialOauthLoginRequest, OauthLoginResponse, TokenReissueRequest, TokenReissueResponse
// 가상 스펙: EmailLoginRequest, EmailLoginResponse (백엔드 확정 대기)

export type OauthProvider = "KAKAO" | "NAVER" | "GOOGLE";

// ── 소셜 로그인 (swagger 확정) ─────────────────────
export interface SocialOauthLoginRequest {
  provider: OauthProvider;
  code: string;
}

export interface OauthLoginResponse {
  userId: number;
  name: string;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
  /** ms 단위로 가정 (swagger int64) */
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

// ── 이메일 로그인 (가상) ────────────────────────────
export interface EmailLoginRequest {
  email: string;
  password: string;
}

/** 이메일 로그인 응답은 OauthLoginResponse와 동일 shape 가정 */
export type EmailLoginResponse = OauthLoginResponse;

// ── 토큰 재발급 ─────────────────────────────────────
export interface TokenReissueRequest {
  refreshToken: string;
}

export interface TokenReissueResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

// ── User 도메인 ──────────────────────────────────────
export interface User {
  userId: number;
  name: string;
}
