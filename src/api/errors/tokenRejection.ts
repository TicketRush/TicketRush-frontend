// -------------------------------------------------------
// 토큰 무효 응답 판별 (이슈 #326)
//
// 서버 재시작·토큰 만료 후에도 localStorage에 남은 토큰으로 요청이 나가면
// 서버는 그 요청을 거부한다. 이때 상태 코드는 환경에 따라 다르다:
//   - 서비스가 직접 거부: 401 + envelope(AUTH_401_00x)
//   - 게이트웨이/필터 단계에서 거부: 403 + envelope 아닌 body(또는 빈 body)
//
// 403을 무조건 토큰 무효로 보면 안 된다. MEMBER가 관리자 API를 호출해서 받은
// "권한 부족" 403까지 재발급·강제 로그아웃 경로를 타면, 정상 로그인 사용자가
// 엉뚱하게 로그아웃된다. 그래서 아래 두 조건으로 좁힌다.
//   1. 요청에 Authorization 헤더가 실제로 붙어 있었다 (익명 요청의 403은 권한 문제)
//   2. 응답이 권한 부족을 명시하는 백엔드 envelope가 아니다
// -------------------------------------------------------

import { ERROR_CODES } from "./errorCodes";

/** 상태 코드가 403이어도 내용은 인증(토큰) 실패인 코드 */
function isAuthTokenErrorCode(code: string): boolean {
  return code === ERROR_CODES.UNAUTHORIZED || code.startsWith("AUTH_401_");
}

/**
 * 응답 body가 백엔드 공통 envelope이면 code를 꺼낸다. 아니면 undefined.
 *
 * 판별 기준은 code 필드의 존재다. 백엔드 envelope에는 항상 code가 있고,
 * 게이트웨이 원문이나 Spring 기본 에러 body(timestamp/status/error/path)에는 없다.
 */
function readEnvelopeCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const { code } = data as { code?: unknown };
  return typeof code === "string" ? code : undefined;
}

export interface TokenRejectionInput {
  /** HTTP 상태 코드 */
  status: number;
  /** 요청에 Authorization 헤더가 붙어 있었는지 */
  hadAuthorizationHeader: boolean;
  /** 응답 body — 백엔드 envelope일 수도, 게이트웨이 원문일 수도 있다 */
  data?: unknown;
}

/**
 * 들고 있는 토큰이 거부된 응답인지 판별.
 *
 * true면 refresh 재발급을 시도하고, 실패 시 강제 로그아웃해야 한다.
 * false면 인증과 무관한 에러이므로 그대로 호출측에 전파한다.
 */
export function isTokenRejection({
  status,
  hadAuthorizationHeader,
  data,
}: TokenRejectionInput): boolean {
  if (status === 401) return true;
  if (status !== 403) return false;

  // 토큰을 보내지도 않았다면 우리 토큰의 문제가 아니다
  if (!hadAuthorizationHeader) return false;

  const code = readEnvelopeCode(data);
  // envelope가 없다 = 컨트롤러에 닿기 전(게이트웨이·시큐리티 필터)에서 잘렸다 → 토큰 문제
  if (!code) return true;

  // envelope가 있으면 권한 부족(AUTH_403_001 등)이므로 인증 코드일 때만 토큰 문제
  return isAuthTokenErrorCode(code);
}
