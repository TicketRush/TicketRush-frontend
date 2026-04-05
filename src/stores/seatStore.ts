// stores/seatStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "../utils/sessionStorageAdapter";

// sessionStorage 사용 — 탭별 독립 예매 플로우 보장 (스토리지 전략 상세: authStore.ts 참고)

interface Seat {
  id: string;
  label: string;
}

interface SeatState {
  selectedSeat: Seat | null;
  selectSeat: (seat: Seat) => void;
  deselectSeat: () => void;
  clearSeat: () => void;
}

export const useSeatStore = create<SeatState>()(
  devtools(
    persist(
      (set) => ({
        selectedSeat: null,

        selectSeat: (seat) => set({ selectedSeat: seat }),
        deselectSeat: () => set({ selectedSeat: null }),
        clearSeat: () => set({ selectedSeat: null }),
      }),
      { name: "seat-storage", storage: sessionStorageAdapter },
    ),
  ),
);
