// stores/seatStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "../utils/sessionStorageAdapter";

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

const useSeatStore = create<SeatState>()(
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

// 사용 시:
// const selectedSeat = useSeatStore((s) => s.selectedSeat);
// const hasSeat = useSeatStore((s) => !!s.selectedSeat);
// const totalPrice = selectedSeat ? concertPrice : 0;
export default useSeatStore;
