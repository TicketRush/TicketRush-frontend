// 인증 API
// USE_MOCK 플래그로 mock/real 분기 (백엔드 연동 시 false로)

import apiClient from "./instance";
import type {
  SocialOauthLoginRequest,
  OauthLoginResponse,
  TokenReissueRequest,
  TokenReissueResponse,
  EmailLoginRequest,
  EmailLoginResponse,
} from "@/types/domain/auth";

const USE_MOCK = true;

/** 소셜 로그인 — swagger 확정: POST /api/v1/auth/social/login */
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

/** 이메일 로그인 — 가상 스펙 (백엔드 확정 대기) */
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

/** 토큰 재발급 — swagger 확정: POST /api/v1/auth/reissue */
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

/** OAuth URL 조회 — swagger 확정: GET /api/v1/auth/oauth/{provider}/url */
export async function getOauthUrlApi(provider: string): Promise<string> {
  if (USE_MOCK) {
    const { mockOauthUrl } = await import("./mocks/auth");
    return mockOauthUrl(provider);
  }
  const res = await apiClient.get<string>(`/api/v1/auth/oauth/${provider}/url`);
  return res.data;
}

/** 로그아웃 — swagger 확정: POST /api/v1/auth/logout */
export async function logoutApi(): Promise<void> {
  if (USE_MOCK) {
    const { mockLogout } = await import("./mocks/auth");
    return mockLogout();
  }
  await apiClient.post("/api/v1/auth/logout");
}

// ─────────────────────────────────────────────────────
// 이메일 인증 — 가상 스펙 (혜림 백엔드 확정 대기)
// ─────────────────────────────────────────────────────

/** 이메일 인증번호 발송 */
export async function sendEmailVerificationApi(email: string): Promise<void> {
  if (USE_MOCK) {
    // 0.5초 지연 + mock에서는 항상 성공
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  await apiClient.post("/api/v1/auth/email/send-code", { email });
}

/** 이메일 인증번호 확인 */
export async function verifyEmailCodeApi(
  email: string,
  code: string,
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    // mock: "123456"이면 성공, 그 외 실패
    if (code !== "123456") {
      throw new Error("인증번호가 일치하지 않습니다.");
    }
    return;
  }
  await apiClient.post("/api/v1/auth/email/verify-code", { email, code });
}

/** 회원가입 */
export async function signupApi(req: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    // mock: exist@test.com이면 실패
    if (req.email === "exist@test.com") {
      throw { response: { status: 409 } };
    }
    return;
  }
  await apiClient.post("/api/v1/auth/signup", req);
}
