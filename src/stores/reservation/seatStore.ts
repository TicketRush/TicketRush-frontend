// 좌석 선택 store — 1인 1석 정책
//
// ⚠️ Toss 결제창 리다이렉트로 페이지가 완전히 새로 로드되므로, 리다이렉트 복귀 후에도
// 선택된 좌석 정보를 잃지 않도록 sessionStorage에 persist.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Seat } from "@/types/domain/seat";

// 호환성을 위한 re-export
export type { Seat };

interface SeatStoreState {
  /** 1인 1석 정책 — 최대 1개 선택 가능 */
  selectedSeat: Seat | null;

  /**
   * 좌석 토글
   * - 같은 좌석 다시 클릭 → 선택 해제
   * - 다른 좌석 클릭 → 기존 해제 후 새 좌석 선택
   */
  toggleSeat: (seat: Seat) => void;

  /** 명시적 선택 (null이면 해제) */
  selectSeat: (seat: Seat | null) => void;

  /** 예매 플로우 종료 시 초기화 */
  reset: () => void;
}

const useSeatStore = create<SeatStoreState>()(
  persist(
    (set, get) => ({
      selectedSeat: null,

      toggleSeat: (seat) => {
        const current = get().selectedSeat;
        if (current?.id === seat.id) {
          set({ selectedSeat: null });
        } else {
          set({ selectedSeat: seat });
        }
      },

      selectSeat: (seat) => set({ selectedSeat: seat }),

      reset: () => set({ selectedSeat: null }),
    }),
    {
      name: "seat-storage",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export default useSeatStore;
