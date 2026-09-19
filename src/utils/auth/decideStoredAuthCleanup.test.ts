import { describe, expect, it } from "vitest";
import {
  clearExpiredStoredAuth,
  shouldClearStoredAuth,
} from "./decideStoredAuthCleanup";
import { isJwtExpired, readJwtExpiry } from "./jwt";

const NOW = Date.UTC(2026, 8, 19, 0, 0, 0);

/** exp만 담은 서명 없는 JWT (프론트는 exp만 읽는다) */
function jwt(expiresAtMs: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiresAtMs / 1000) }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

const live = () => jwt(NOW + 60_000);
const dead = () => jwt(NOW - 60_000);

describe("readJwtExpiry", () => {
  it("exp를 ms로 읽는다", () => {
    expect(readJwtExpiry(jwt(NOW))).toBe(Math.floor(NOW / 1000) * 1000);
  });

  it.each([
    ["mock 토큰", "mock-access-1758240000000"],
    ["빈 문자열", ""],
    ["점만 있는 문자열", "a.b.c"],
    ["null", null],
    ["undefined", undefined],
  ])("%s는 판단하지 않는다", (_label, token) => {
    expect(readJwtExpiry(token)).toBeNull();
    expect(isJwtExpired(token, NOW)).toBe(false);
  });

  it("exp가 없는 JWT는 판단하지 않는다", () => {
    const payload = btoa(JSON.stringify({ sub: "1" })).replace(/=+$/, "");
    expect(readJwtExpiry(`header.${payload}.sig`)).toBeNull();
  });
});

describe("shouldClearStoredAuth", () => {
  it("비로그인 상태는 그대로 둔다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: null, refreshToken: null }, NOW),
    ).toBe(false);
  });

  it("둘 다 살아 있으면 유지한다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: live(), refreshToken: live() }, NOW),
    ).toBe(false);
  });

  it("access만 만료됐고 refresh가 살아 있으면 유지한다 — 재발급으로 복구된다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: dead(), refreshToken: live() }, NOW),
    ).toBe(false);
  });

  it("둘 다 만료됐으면 지운다 — 서버 재시작·장기 미접속", () => {
    expect(
      shouldClearStoredAuth({ accessToken: dead(), refreshToken: dead() }, NOW),
    ).toBe(true);
  });

  it("refresh가 없고 access가 만료됐으면 지운다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: dead(), refreshToken: null }, NOW),
    ).toBe(true);
  });

  it("refresh가 없어도 access가 살아 있으면 유지한다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: live(), refreshToken: null }, NOW),
    ).toBe(false);
  });

  it("access가 없고 refresh만 살아 있으면 유지한다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: null, refreshToken: live() }, NOW),
    ).toBe(false);
  });

  it("access가 없고 refresh도 만료됐으면 지운다", () => {
    expect(
      shouldClearStoredAuth({ accessToken: null, refreshToken: dead() }, NOW),
    ).toBe(true);
  });

  it("exp를 읽을 수 없는 mock 토큰은 유지한다 — mock 모드를 끊지 않는다", () => {
    expect(
      shouldClearStoredAuth(
        {
          accessToken: "mock-access-1758240000000",
          refreshToken: "mock-refresh-1758240000000",
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("만료 세션은 토큰과 user를 함께 비운다", () => {
    const persisted = {
      accessToken: dead(),
      refreshToken: dead(),
      user: { userId: 1, name: "김철수" },
    };
    expect(clearExpiredStoredAuth(persisted, NOW)).toEqual({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  });

  it("살린 세션은 그대로 돌려준다", () => {
    const persisted = {
      accessToken: live(),
      refreshToken: live(),
      user: { userId: 1, name: "김철수" },
    };
    expect(clearExpiredStoredAuth(persisted, NOW)).toBe(persisted);
  });

  it("만료 시각이 정확히 지금이면 만료로 본다", () => {
    expect(
      shouldClearStoredAuth(
        { accessToken: jwt(NOW), refreshToken: jwt(NOW) },
        NOW,
      ),
    ).toBe(true);
  });
});
