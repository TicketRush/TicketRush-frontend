// stores/timerStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "../utils/sessionStorageAdapter";

const TIMER_DURATION = 300; // 5분

interface TimerState {
  startedAt: number | null;
  timeLeft: number;
  isRunning: boolean;

  startTimer: () => void;
  tick: () => void;
  resetTimer: () => void;
}

export const useTimerStore = create<TimerState>()(
  devtools(
    persist(
      (set, get) => ({
        startedAt: null,
        timeLeft: TIMER_DURATION,
        isRunning: false,

        startTimer: () =>
          set({
            startedAt: Date.now(),
            timeLeft: TIMER_DURATION,
            isRunning: true,
          }),

        tick: () => {
          const { startedAt } = get();
          if (!startedAt) return;

          // startedAt 기반으로 계산 → 탭 비활성화해도 정확
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          const remaining = Math.max(0, TIMER_DURATION - elapsed);

          set({ timeLeft: remaining });

          // 시간 만료 시 자동 정지
          if (remaining <= 0) {
            set({ isRunning: false });
          }
        },

        resetTimer: () =>
          set({
            startedAt: null,
            timeLeft: TIMER_DURATION,
            isRunning: false,
          }),
      }),
      { name: "timer-storage", storage: sessionStorageAdapter },
    ),
  ),
);
