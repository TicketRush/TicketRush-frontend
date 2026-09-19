import { describe, expect, it } from "vitest";
import { isTokenRejection } from "./tokenRejection";
import { ERROR_CODES } from "./errorCodes";

function envelope(code: string) {
  return { isSuccess: false, code, message: "x", result: null };
}

describe("isTokenRejection", () => {
  it("401은 토큰 무효로 본다", () => {
    expect(
      isTokenRejection({
        status: 401,
        hadAuthorizationHeader: true,
        data: envelope(ERROR_CODES.AUTH_EXPIRED_TOKEN),
      }),
    ).toBe(true);
  });

  it("헤더가 없던 401도 토큰 무효로 본다 (인증 필요 응답)", () => {
    expect(
      isTokenRejection({ status: 401, hadAuthorizationHeader: false }),
    ).toBe(true);
  });

  it("게이트웨이가 envelope 없이 403으로 자른 경우 토큰 무효로 본다", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: true,
        data: "Forbidden",
      }),
    ).toBe(true);
  });

  it("body가 비어도 403 + 토큰 전송이면 토큰 무효로 본다", () => {
    expect(
      isTokenRejection({ status: 403, hadAuthorizationHeader: true }),
    ).toBe(true);
  });

  it("Spring 기본 에러 body(code 없음)로 온 403도 토큰 무효로 본다", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: true,
        data: {
          timestamp: "2026-09-19T00:00:00.000+00:00",
          status: 403,
          error: "Forbidden",
          path: "/api/v1/booking/me",
        },
      }),
    ).toBe(true);
  });

  it("상태만 403이고 코드가 401 계열이면 토큰 무효로 본다", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: true,
        data: envelope(ERROR_CODES.AUTH_INVALID_ACCESS_TOKEN),
      }),
    ).toBe(true);
  });

  it("권한 부족(AUTH_403_001)은 토큰 무효가 아니다 — MEMBER가 관리자 API 호출", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: true,
        data: envelope(ERROR_CODES.AUTH_ACCESS_DENIED),
      }),
    ).toBe(false);
  });

  it("이메일 인증 재발송 제한(AUTH_403_002)은 토큰 무효가 아니다", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: true,
        data: envelope(ERROR_CODES.AUTH_EMAIL_AUTH_NUMBER_SEND_TOO_FREQUENT),
      }),
    ).toBe(false);
  });

  it("토큰을 보내지 않은 403은 토큰 무효가 아니다", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: false,
        data: "Forbidden",
      }),
    ).toBe(false);
  });

  it("COMMON_403은 권한 부족으로 보고 로그아웃하지 않는다", () => {
    expect(
      isTokenRejection({
        status: 403,
        hadAuthorizationHeader: true,
        data: envelope(ERROR_CODES.FORBIDDEN),
      }),
    ).toBe(false);
  });

  it("401·403이 아닌 상태 코드는 대상이 아니다", () => {
    for (const status of [400, 404, 409, 500, 503, 0]) {
      expect(
        isTokenRejection({ status, hadAuthorizationHeader: true }),
      ).toBe(false);
    }
  });
});
