import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyLoginRedirectFromLocation,
  consumeLoginRedirect,
  resolveLandingPath,
  saveLoginRedirect,
  toInternalPath,
} from "./loginRedirect";

describe("toInternalPath", () => {
  it("Location 객체에서 pathname·search·hash를 이어붙인다", () => {
    expect(
      toInternalPath({
        pathname: "/concerts/123/seats",
        search: "?a=1",
        hash: "#b",
      }),
    ).toBe("/concerts/123/seats?a=1#b");
  });

  it("문자열 경로도 그대로 허용한다", () => {
    expect(toInternalPath("/concerts/123/seats")).toBe("/concerts/123/seats");
  });

  it("외부로 나갈 수 있는 경로는 차단한다", () => {
    expect(toInternalPath("//evil.com")).toBeNull();
    expect(toInternalPath("/\\evil.com")).toBeNull();
    expect(toInternalPath("https://evil.com")).toBeNull();
    expect(toInternalPath("concerts/123")).toBeNull();
  });

  it("인증 페이지로 되돌아가는 경로는 차단한다", () => {
    expect(toInternalPath("/login")).toBeNull();
    expect(toInternalPath("/signup")).toBeNull();
    expect(toInternalPath("/login?next=/admin")).toBeNull();
    expect(toInternalPath("/signup#form")).toBeNull();
    expect(toInternalPath("/login/")).toBeNull();
  });

  it("값이 없거나 형태가 다르면 null", () => {
    expect(toInternalPath(undefined)).toBeNull();
    expect(toInternalPath(null)).toBeNull();
    expect(toInternalPath({})).toBeNull();
    expect(toInternalPath(123)).toBeNull();
  });
});

// vitest 기본 환경(node)에는 sessionStorage가 없어 최소 동작만 흉내낸다
function createSessionStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

describe("saveLoginRedirect / consumeLoginRedirect", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageStub());
  });

  it("저장한 경로를 한 번만 반환하고 비운다", () => {
    saveLoginRedirect({
      pathname: "/concerts/123/seats",
      search: "",
      hash: "",
    });

    expect(consumeLoginRedirect()).toBe("/concerts/123/seats");
    expect(consumeLoginRedirect()).toBeNull();
  });

  it("유효하지 않은 값은 기존 저장값을 덮어쓰지 않는다", () => {
    saveLoginRedirect("/concerts/123/seats");
    saveLoginRedirect(undefined);
    saveLoginRedirect("//evil.com");

    expect(consumeLoginRedirect()).toBe("/concerts/123/seats");
  });

  it("저장된 값이 없으면 null", () => {
    expect(consumeLoginRedirect()).toBeNull();
  });
});

describe("applyLoginRedirectFromLocation / resolveLandingPath", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageStub());
  });

  it("from이 없으면 이전에 저장한 경로를 지운다", () => {
    saveLoginRedirect("/concerts/123/seats");
    applyLoginRedirectFromLocation(undefined);
    expect(consumeLoginRedirect()).toBeNull();
  });

  it("preserveRedirect면 from이 없어도 저장값을 유지한다", () => {
    saveLoginRedirect("/concerts/123/seats");
    applyLoginRedirectFromLocation({ preserveRedirect: true });
    expect(consumeLoginRedirect()).toBe("/concerts/123/seats");
  });

  it("ADMIN은 복귀 경로를 무시하고 /admin으로 보낸다", () => {
    saveLoginRedirect("/concerts/123/seats");
    expect(resolveLandingPath("ADMIN")).toBe("/admin");
    expect(consumeLoginRedirect()).toBeNull();
  });

  it("MEMBER는 복귀 경로를 따른다", () => {
    saveLoginRedirect("/concerts/123/seats");
    expect(resolveLandingPath("MEMBER")).toBe("/concerts/123/seats");
  });

  it("role 미확정이면 회원도 복귀하지 않는다", () => {
    saveLoginRedirect("/concerts/123/seats");
    expect(resolveLandingPath("MEMBER", { allowRedirect: false })).toBe("/");
    expect(consumeLoginRedirect()).toBeNull();
  });
});
