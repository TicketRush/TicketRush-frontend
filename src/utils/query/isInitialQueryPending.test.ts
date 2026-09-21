import { describe, expect, it } from "vitest";
import { isInitialQueryPending } from "./isInitialQueryPending";

describe("isInitialQueryPending", () => {
  it("데이터가 없어 로딩 중이면 true다", () => {
    expect(isInitialQueryPending(true, true, false)).toBe(true);
  });

  it("캐시가 있어도 마운트 후 첫 refetch가 끝나기 전이면 true다", () => {
    expect(isInitialQueryPending(false, true, false)).toBe(true);
  });

  it("첫 조회 이후 백그라운드 refetch는 false다", () => {
    expect(isInitialQueryPending(false, true, true)).toBe(false);
  });

  it("조회가 끝나면 false다", () => {
    expect(isInitialQueryPending(false, false, true)).toBe(false);
  });
});
