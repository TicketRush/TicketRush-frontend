export type TimerRunStatus = "idle" | "running" | "expired";

export type PendingTimerRestoreDecision =
  | { kind: "skip-expired" }
  | { kind: "restore"; expiresAt: string }
  | { kind: "missing" }
  | { kind: "failed" }
  | { kind: "keep-local" };

/**
 * PENDING 타이머 복원 결과.
 * 로컬 5분이 이미 돌고 있으면 조회 실패/목록 공백을 만료로 보지 않고,
 * 서버 expires_at이 오면 덮어쓴다 (#167 리뷰).
 */
export function decidePendingTimerRestore(input: {
  timerStatus: TimerRunStatus;
  expiresAt?: string | null;
  fetchFailed?: boolean;
}): PendingTimerRestoreDecision {
  if (input.timerStatus === "expired") return { kind: "skip-expired" };

  if (input.fetchFailed) {
    return input.timerStatus === "running"
      ? { kind: "keep-local" }
      : { kind: "failed" };
  }

  if (input.expiresAt) {
    return { kind: "restore", expiresAt: input.expiresAt };
  }

  return input.timerStatus === "running"
    ? { kind: "keep-local" }
    : { kind: "missing" };
}
