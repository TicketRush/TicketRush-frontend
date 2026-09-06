import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useEffect } from "react";
import { remainingMsUntil } from "@/utils/booking/parseBackendDateTime";

type TimerStatus = "idle" | "running" | "expired";

interface TimerState {
  status: TimerStatus;
  remainingMs: number;
  durationMs: number;

  /** 타이머 시작 (default 5분). 생성 직후 표시용. 이후 화면이 expires_at으로 덮어쓴다. */
  startTimer: (durationMs?: number) => void;
  /** 서버 expires_at 기준 카운트다운. 링 분모는 5분 유지 (#167). */
  startTimerFromExpiresAt: (expiresAt: string) => void;
  /** 타이머 정지 (정상 종료 — 결제 성공 시) */
  stopTimer: () => void;
  /** 모든 상태 초기화 */
  reset: () => void;
}

const DEFAULT_DURATION_MS = 5 * 60 * 1000;

// 모듈 스코프 — store 외부에 interval ID 보관 (state에 넣으면 비교 리렌더 발생)
let intervalId: ReturnType<typeof setInterval> | null = null;

function clearTimerInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function beginCountdown(
  set: (partial: Partial<TimerState>) => void,
  remainingMs: number,
  durationMs: number,
) {
  clearTimerInterval();
  const endsAt = Date.now() + remainingMs;

  set({ status: "running", durationMs, remainingMs });

  intervalId = setInterval(() => {
    const remaining = Math.max(0, endsAt - Date.now());

    if (remaining <= 0) {
      clearTimerInterval();
      set({ status: "expired", remainingMs: 0 });
    } else {
      set({ remainingMs: remaining });
    }
  }, 250);
}

export const useTimerStore = create<TimerState>()(
  devtools(
    (set) => ({
      status: "idle",
      remainingMs: 0,
      durationMs: DEFAULT_DURATION_MS,

      startTimer: (durationMs = DEFAULT_DURATION_MS) => {
        beginCountdown(set, durationMs, durationMs);
      },

      startTimerFromExpiresAt: (expiresAt: string) => {
        const remaining = remainingMsUntil(expiresAt);
        if (remaining <= 0) {
          clearTimerInterval();
          set({
            status: "expired",
            remainingMs: 0,
            durationMs: DEFAULT_DURATION_MS,
          });
          return;
        }
        beginCountdown(set, remaining, DEFAULT_DURATION_MS);
      },

      stopTimer: () => {
        clearTimerInterval();
        set({ status: "idle", remainingMs: 0 });
      },

      reset: () => {
        clearTimerInterval();
        set({
          status: "idle",
          remainingMs: 0,
          durationMs: DEFAULT_DURATION_MS,
        });
      },
    }),
    { name: "TimerStore" },
  ),
);

// ─────────────────────────────────────────────────────────
// Convenience hooks
// ─────────────────────────────────────────────────────────

/**
 * 타이머가 expired 상태로 전이되는 순간을 감지하여 콜백 실행.
 * - status가 'expired'로 바뀌는 순간 한 번만 호출됨
 * - 콜백 안에서 reset() 호출하면 다음 진입 시 중복 실행 방지
 *
 * @example
 *   useTimerExpiry(() => {
 *     paymentStore.expire();
 *     navigate("/payment/expired");
 *   });
 */
export function useTimerExpiry(onExpire: () => void) {
  const status = useTimerStore((s) => s.status);
  useEffect(() => {
    if (status === "expired") onExpire();
    // onExpire는 매 렌더마다 새 함수일 수 있어 의존성에서 제외 (필요 시 useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
}

/** 남은 시간을 mm:ss 포맷으로 (CircularTimer 등에서 사용) */
export function useTimerDisplay() {
  const remainingMs = useTimerStore((s) => s.remainingMs);
  const durationMs = useTimerStore((s) => s.durationMs);

  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const formatted = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const progress = durationMs > 0 ? remainingMs / durationMs : 0;

  return { mm, ss, formatted, remainingMs, progress };
}

export default useTimerStore;
