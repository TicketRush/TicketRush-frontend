import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "@/utils/storage/sessionStorageAdapter.ts";

/**
 * 예매 플로우 동안 유지되는 공연 정보.
 * ConcertDetailPage → SeatSelectionPage → 결제 페이지들에서 사용.
 *
 * 모든 필드를 optional로 두지 않고 핵심 필드는 필수,
 * 추가 메타데이터는 optional로 분리.
 */
interface Concert {
  // ── 필수 ──────────────────────────
  id: string;
  title: string;
  price: number;
  date: string;
  time: string;
  venue: string;

  // ── optional (페이지에 따라 사용) ──
  artist?: string;
  genre?: string;
  posterUrl?: string;
  address?: string;
  duration?: number;
  totalSeats?: number;
  remainingSeats?: number;
  status?: string;
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
