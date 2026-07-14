// 인증/유저 도메인 타입
//
// 백엔드 auth-service, user-service swagger (2026-07-02) 스펙 반영
//
// 주요 변경:
//   - EmailLoginResponse 필드 정리 (이미 email, role, joinedAt 있음)
//   - 회원가입 이메일 인증 3단계 타입 신규 추가 (send/verify/consume)
//   - 회원가입 요청 타입 신규 추가
//   - Dev Auth 토큰 발급 타입 신규 추가 (개발 편의용)
//   - User 인터페이스에 email, role, joinedAt 필드 추가

export type OauthProvider = "KAKAO" | "NAVER" | "GOOGLE";
export type UserRole = "MEMBER" | "ADMIN";

// ── 소셜 로그인 (백엔드 확정) ───────────────────────
export interface SocialOauthLoginRequest {
  provider: OauthProvider;
  code: string;
}

export interface OauthLoginResponse {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
  /** 만료까지 남은 시간 (초) */
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

/** 소셜 OAuth URL 조회 응답 */
export interface OauthUrlResponse {
  url: string;
}

// ── 이메일 로그인 (백엔드 확정) ──────────────────────
export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface EmailLoginResponse {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

// ── 회원가입 이메일 인증 3단계 (백엔드 확정) ─────────
/** 1단계 — 이메일에 인증 코드 발송 */
export interface EmailAuthSendRequest {
  email: string;
}

/** 2단계 — 인증 코드 확인 */
export interface EmailAuthVerifyRequest {
  email: string;
  /** 백엔드 필드명 auth_number */
  authNumber: string;
}

/** 3단계 — 인증 상태 소비 (회원가입 직전) */
export interface EmailAuthConsumeRequest {
  email: string;
}

// ── 회원가입 (백엔드 확정) ────────────────────────────
/**
 * POST /api/v1/user/signup 요청
 *
 * 이메일 인증 3단계(send/verify/consume) 완료 후 호출.
 */
export interface SignupRequest {
  email: string;
  password: string;
  /** 백엔드 필드명 password_confirm */
  passwordConfirm: string;
  name: string;
}

export interface SignupResponse {
  userId: number;
  email: string;
  name: string;
}

// ── 이메일 중복 확인 (백엔드 확정) ────────────────────
export interface EmailCheckResponse {
  isDuplicated: boolean;
}

// ── 소셜 회원 등록 (백엔드 확정) ──────────────────────
/**
 * POST /api/v1/user/social-login 요청
 *
 * 소셜 로그인 응답의 isNewUser=true일 때 회원 등록 목적으로 호출.
 */
export interface SocialSignupRequest {
  provider: OauthProvider;
  providerId: string;
  email: string;
  name: string;
}

// ── 토큰 재발급 (백엔드 확정) ─────────────────────────
export interface TokenReissueRequest {
  refreshToken: string;
}

export interface TokenReissueResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

// ── 내 정보 (백엔드 확정) ─────────────────────────────
/**
 * GET /api/v1/user/me 응답
 *
 * ⚠️ 현재 백엔드 응답에 role 필드 없음.
 * (관리자 페이지 접근 판단용).
 */
export interface MeResponse {
  userId: number;
  email: string;
  name: string;
  joinedAt: string;
  /** ⚠️ 백엔드 추가 대기 */
  role?: UserRole;
}

// ── Dev Auth 토큰 (개발용) ────────────────────────────
/**
 * POST /api/v1/dev/auth/token 요청
 *
 * 개발 편의용 — 소셜 로그인 없이 특정 userId로 토큰 발급.
 * 운영에서는 비활성화되어야 함.
 */
export interface DevAuthTokenRequest {
  userId: number;
}

export interface DevAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

// ── User 도메인 (프론트 authStore) ────────────────────
/**
 * authStore에 저장되는 사용자 정보.
 * 로그인 응답의 일부를 저장.
 */
export interface User {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}
