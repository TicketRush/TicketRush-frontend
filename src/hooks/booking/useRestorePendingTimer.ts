import { useCallback, useEffect, useState } from "react";
import { fetchPendingBookingExpiresAt } from "@/api/bookings";
import { useTimerStore } from "@/stores/reservation/timerStore";

export type PendingTimerRestoreStatus =
  | "idle"
  | "skipped"
  | "loading"
  | "restored"
  | "missing"
  | "failed";

/**
 * 새로고침 등으로 timerStore가 idle인데 PENDING 예매가 남아 있으면
 * GET /booking/me?status=PENDING 의 expires_at 으로 카운트다운을 복원한다 (#167).
 *
 * - missing: PENDING 목록에 없음 → 서버에서 이미 만료/취소된 것으로 본다
 * - failed: 조회 실패. 로컬 5분으로 채우지 않는다
 */
export function useRestorePendingTimer(bookingNumber: string | null) {
  const timerStatus = useTimerStore((s) => s.status);
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
    if (timerStatus === "running" || timerStatus === "expired") {
      setStatus("skipped");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void fetchPendingBookingExpiresAt(bookingNumber)
      .then((expiresAt) => {
        if (cancelled) return;
        const current = useTimerStore.getState().status;
        if (current === "running" || current === "expired") {
          setStatus("skipped");
          return;
        }
        if (!expiresAt) {
          setStatus("missing");
          return;
        }
        startTimerFromExpiresAt(expiresAt);
        setStatus("restored");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [bookingNumber, timerStatus, startTimerFromExpiresAt, retryKey]);

  return { status, retry };
}
