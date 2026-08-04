// 인증/유저 도메인 타입
//
// 백엔드 auth-service, user-service 스펙 반영 (2026-07-19 백엔드 코드 직접 확인)
//
// 주요 변경:
//   - UserRole(프론트/DB/me): "MEMBER" | "ADMIN"
//   - 이메일 로그인 응답 role: BE LoginUseCase가 MEMBER→"USER"로 normalize
//   - OauthLoginResponse: email/role 없음 (userId, name, isNewUser, 토큰류만)
//   - MeResponse: name, email, createdAt, role (BE #558/#568)
//   - EmailCheckResponse: isDuplicated → exists
//   - EmailAuthConsumeRequest 제거 (해당 엔드포인트 존재하지 않음)
//   - DevAuthTokenResponse: LoginResponse와 동일 구조로 정정

export type OauthProvider = "KAKAO" | "NAVER" | "GOOGLE";
/** authStore / AdminRoute / GET /me 기준 권한 */
export type UserRole = "MEMBER" | "ADMIN";
/**
 * 이메일 로그인 응답·JWT claim에 올 수 있는 role.
 * BE `LoginUseCase.normalizeRole`: DB MEMBER → "USER", ADMIN → "ADMIN".
 * 프론트 저장 시 `toUserRole()`로 UserRole에 맞춘다.
 */
export type LoginResponseRole = "USER" | "MEMBER" | "ADMIN";

// ── 소셜 로그인 ───────────────────────────────────────
export interface SocialOauthLoginRequest {
  provider: OauthProvider;
  code: string;
}

/**
 * POST /api/v1/auth/social/login 응답
 * 백엔드 OauthLoginResponse DTO: email/role/joinedAt 없음.
 */
export interface OauthLoginResponse {
  userId: number;
  name: string;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

/** 소셜 OAuth URL 조회 응답 */
export interface OauthUrlResponse {
  url: string;
}

// ── 이메일 로그인 ──────────────────────────────────────
export interface EmailLoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/v1/auth/login 응답
 * 백엔드 LoginResponse DTO: name/joinedAt/expiresIn 없음.
 * role은 MEMBER→USER normalize 값이 올 수 있음 → authStore에는 UserRole로 변환.
 */
export interface EmailLoginResponse {
  userId: number;
  email: string;
  role: LoginResponseRole;
  accessToken: string;
  refreshToken: string;
}

// ── 회원가입 이메일 인증 2단계 (백엔드 확정) ──────────
// ⚠️ "consume" 3단계는 존재하지 않음 (2026-07-18, 404 확인).
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

// ── 회원가입 (백엔드 확정) ────────────────────────────
/**
 * POST /api/v1/user/signup 요청
 *
 * 이메일 인증(send/verify) 완료 후 바로 호출.
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
  exists: boolean;
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
 * BE #558/#568: name, email, createdAt, role (DB enum 그대로 MEMBER|ADMIN)
 */
export interface MeResponse {
  name: string;
  email: string;
  createdAt: string;
  role: UserRole;
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

/** 응답 구조는 LoginResponse와 동일 (userId, email, role, accessToken, refreshToken) */
export interface DevAuthTokenResponse {
  userId: number;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

// ── User 도메인 (프론트 authStore) ────────────────────
/**
 * authStore에 저장되는 사용자 정보.
 * 로그인 응답에 없는 필드(email/name/joinedAt 등)는 getMeApi()로 비동기 보강.
 */
export interface User {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}
