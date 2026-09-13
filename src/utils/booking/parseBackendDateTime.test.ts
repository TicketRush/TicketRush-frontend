import { describe, expect, it } from "vitest";
import {
  parseBackendDateTime,
  remainingMsUntil,
} from "./parseBackendDateTime";

describe("parseBackendDateTime", () => {
  it("오프셋 없는 naive를 UTC Instant로 파싱한다", () => {
    const ms = parseBackendDateTime("2026-08-02 10:35:00");
    expect(ms).toBe(Date.UTC(2026, 7, 2, 10, 35, 0));
  });

  it("naive UTC와 동일 시각의 Z ISO가 같은 epoch ms다", () => {
    const naive = parseBackendDateTime("2026-09-13 03:05:00");
    const withZ = parseBackendDateTime("2026-09-13T03:05:00.000Z");
    expect(naive).toBe(withZ);
    expect(naive).toBe(Date.parse("2026-09-13T03:05:00.000Z"));
  });

  it("ISO Z도 파싱한다", () => {
    const ms = parseBackendDateTime("2026-08-02T10:35:00.000Z");
    expect(ms).toBe(Date.parse("2026-08-02T10:35:00.000Z"));
  });

  it("+09:00 offset을 Instant로 파싱한다", () => {
    const ms = parseBackendDateTime("2026-09-13T12:05:00+09:00");
    expect(ms).toBe(Date.parse("2026-09-13T03:05:00.000Z"));
  });

  it("빈 문자열은 null이다", () => {
    expect(parseBackendDateTime("")).toBeNull();
    expect(parseBackendDateTime("   ")).toBeNull();
  });
});

describe("remainingMsUntil", () => {
  it("5분 남은 UTC naive는 즉시 0이 아니다", () => {
    const now = Date.UTC(2026, 8, 13, 3, 0, 0);
    expect(remainingMsUntil("2026-09-13 03:05:00", now)).toBe(5 * 60 * 1000);
    expect(remainingMsUntil("2026-09-13T03:05:00Z", now)).toBe(5 * 60 * 1000);
  });

  it("만료 시각까지 남은 ms를 반환한다", () => {
    const now = Date.UTC(2026, 7, 2, 1, 30, 0);
    const expires = "2026-08-02 10:35:00";
    expect(remainingMsUntil(expires, now)).toBe(
      Date.UTC(2026, 7, 2, 10, 35, 0) - now,
    );
  });

  it("지난 시각은 0이다", () => {
    expect(remainingMsUntil("2020-01-01 00:00:00", Date.now())).toBe(0);
  });
});
