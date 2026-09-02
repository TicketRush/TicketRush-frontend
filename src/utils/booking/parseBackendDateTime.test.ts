import { describe, expect, it } from "vitest";
import {
  parseBackendDateTime,
  remainingMsUntil,
} from "./parseBackendDateTime";

describe("parseBackendDateTime", () => {
  it("공백 구분 BE 포맷을 로컬 벽시계로 파싱한다", () => {
    const ms = parseBackendDateTime("2026-08-02 10:35:00");
    expect(ms).not.toBeNull();
    const d = new Date(ms!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(35);
    expect(d.getSeconds()).toBe(0);
  });

  it("ISO Z도 파싱한다", () => {
    const ms = parseBackendDateTime("2026-08-02T10:35:00.000Z");
    expect(ms).toBe(Date.parse("2026-08-02T10:35:00.000Z"));
  });

  it("빈 문자열은 null이다", () => {
    expect(parseBackendDateTime("")).toBeNull();
    expect(parseBackendDateTime("   ")).toBeNull();
  });
});

describe("remainingMsUntil", () => {
  it("만료 시각까지 남은 ms를 반환한다", () => {
    const now = Date.UTC(2026, 7, 2, 1, 30, 0);
    const expires = "2026-08-02 10:35:00";
    const parsed = parseBackendDateTime(expires)!;
    expect(remainingMsUntil(expires, now)).toBe(Math.max(0, parsed - now));
  });

  it("지난 시각은 0이다", () => {
    expect(remainingMsUntil("2020-01-01 00:00:00", Date.now())).toBe(0);
  });
});
