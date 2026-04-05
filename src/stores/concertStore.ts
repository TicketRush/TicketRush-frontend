import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "../utils/sessionStorageAdapter";

// sessionStorage 사용 — 탭별 독립 예매 플로우 보장 (스토리지 전략 상세: authStore.ts 참고)

interface Concert {
  id: string;
  title: string;
  price: number;
  date: string;
  venue: string;
}

interface ConcertState {
  currentConcert: Concert | null;
  setConcert: (concert: Concert) => void;
  clearConcert: () => void;
}

export const useConcertStore = create<ConcertState>()(
  devtools(
    persist(
      (set) => ({
        currentConcert: null,
        setConcert: (concert) => set({ currentConcert: concert }),
        clearConcert: () => set({ currentConcert: null }),
      }),
      { name: "concert-storage", storage: sessionStorageAdapter },
    ),
  ),
);
