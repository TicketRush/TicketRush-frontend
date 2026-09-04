import { describe, expect, it } from "vitest";
import { decidePendingTimerRestore } from "./decidePendingTimerRestore";

describe("decidePendingTimerRestore", () => {
  it("이미 만료면 조회 결과와 무관하게 건너뛴다", () => {
    expect(
      decidePendingTimerRestore({
        timerStatus: "expired",
        expiresAt: "2026-09-03 12:00:00",
      }),
    ).toEqual({ kind: "skip-expired" });
    expect(
      decidePendingTimerRestore({
        timerStatus: "expired",
        fetchFailed: true,
      }),
    ).toEqual({ kind: "skip-expired" });
  });

  it("서버 expires_at이 있으면 로컬 타이머가 돌아도 덮어쓴다", () => {
    expect(
      decidePendingTimerRestore({
        timerStatus: "running",
        expiresAt: "2026-09-03 12:00:00",
      }),
    ).toEqual({
      kind: "restore",
      expiresAt: "2026-09-03 12:00:00",
    });
    expect(
      decidePendingTimerRestore({
        timerStatus: "idle",
        expiresAt: "2026-09-03 12:00:00",
      }),
    ).toEqual({
      kind: "restore",
      expiresAt: "2026-09-03 12:00:00",
    });
  });

  it("로컬 타이머가 도는 중 조회 실패·목록 공백은 만료로 보지 않는다", () => {
    expect(
      decidePendingTimerRestore({
        timerStatus: "running",
        fetchFailed: true,
      }),
    ).toEqual({ kind: "keep-local" });
    expect(
      decidePendingTimerRestore({
        timerStatus: "running",
        expiresAt: null,
      }),
    ).toEqual({ kind: "keep-local" });
  });

  it("타이머가 없으면 목록 공백은 만료, 조회 실패는 재시도 대상으로 둔다", () => {
    expect(
      decidePendingTimerRestore({
        timerStatus: "idle",
        expiresAt: null,
      }),
    ).toEqual({ kind: "missing" });
    expect(
      decidePendingTimerRestore({
        timerStatus: "idle",
        fetchFailed: true,
      }),
    ).toEqual({ kind: "failed" });
  });
});
