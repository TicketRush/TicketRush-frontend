import { useCallback, useEffect, useState } from "react";
import { fetchPendingBookingExpiresAt } from "@/api/bookings";
import { useTimerStore } from "@/stores/reservation/timerStore";
import { decidePendingTimerRestore } from "@/utils/booking/decidePendingTimerRestore";

export type PendingTimerRestoreStatus =
  | "idle"
  | "skipped"
  | "loading"
  | "restored"
  | "missing"
  | "failed";

/**
 * GET /booking/me?status=PENDING 의 expires_at 으로 카운트다운을 맞춘다 (#167).
 * 로컬 5분이 이미 돌아도 서버 시각이 오면 덮어쓴다. running 중 조회 실패는 만료로 보지 않는다.
 *
 * - missing: 타이머가 없는데 PENDING 목록에도 없음 → 서버에서 이미 만료/취소된 것으로 본다
 * - failed: 타이머가 없는데 조회 실패. 로컬 5분으로 채우지 않는다
 * - skipped: 이미 만료였거나, 로컬 타이머를 유지한 채 이번 조회를 넘긴 경우
 */
export function useRestorePendingTimer(bookingNumber: string | null) {
  const startTimerFromExpiresAt = useTimerStore(
    (s) => s.startTimerFromExpiresAt,
  );
  const [status, setStatus] = useState<PendingTimerRestoreStatus>("idle");
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setRetryKey((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!bookingNumber) {
      setStatus("idle");
      return;
    }

    const timerStatus = useTimerStore.getState().status;
    if (timerStatus === "expired") {
      setStatus("skipped");
      return;
    }

    let cancelled = false;
    if (timerStatus === "idle") setStatus("loading");

    void fetchPendingBookingExpiresAt(bookingNumber)
      .then((expiresAt) => {
        if (cancelled) return;
        applyRestoreDecision({
          expiresAt,
          startTimerFromExpiresAt,
          setStatus,
        });
      })
      .catch(() => {
        if (cancelled) return;
        applyRestoreDecision({
          fetchFailed: true,
          startTimerFromExpiresAt,
          setStatus,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [bookingNumber, startTimerFromExpiresAt, retryKey]);

  return { status, retry };
}

function applyRestoreDecision(input: {
  expiresAt?: string | null;
  fetchFailed?: boolean;
  startTimerFromExpiresAt: (expiresAt: string) => void;
  setStatus: (status: PendingTimerRestoreStatus) => void;
}) {
  const decision = decidePendingTimerRestore({
    timerStatus: useTimerStore.getState().status,
    expiresAt: input.expiresAt,
    fetchFailed: input.fetchFailed,
  });

  switch (decision.kind) {
    case "skip-expired":
    case "keep-local":
      input.setStatus("skipped");
      return;
    case "missing":
      input.setStatus("missing");
      return;
    case "failed":
      input.setStatus("failed");
      return;
    case "restore":
      input.startTimerFromExpiresAt(decision.expiresAt);
      input.setStatus("restored");
  }
}
