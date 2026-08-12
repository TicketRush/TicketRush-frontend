import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { sessionStorageAdapter } from "@/utils/storage/sessionStorageAdapter.ts";
import type { Genre, ConcertStatus } from "@/types/domain/concert";

/**
 * 예매 플로우 동안 유지되는 공연 정보.
 * ConcertDetailPage → SeatSelectionPage → 결제 페이지들에서 사용.
 *
 * 백엔드 performance-service swagger (2026-06-30) 필드명 정렬.
 *
 * 주요 변경:
 *   - id: string → number
 *   - date → showDate
 *   - time → showTime
 *   - artist → performer
 *   - posterUrl → imageMainUrl
 *   - duration → durationMinutes
 *   - genre / status 타입 좁힘 (string → Genre / ConcertStatus)
 *
 * 도메인의 ConcertSummary와 별도 인터페이스로 유지:
 *   → 페이지마다 필요한 필드가 달라 optional 관리가 자유로움.
 *   → 결제 페이지는 표시용 최소 정보만 필요, 상세 페이지는 전체 필요.
 */
interface Concert {
  // ── 필수 ──────────────────────────
  id: number;
  title: string;
  price: number;
  showDate: string;
  showTime: string;
  venue: string;

  // ── optional (페이지에 따라 사용) ──
  performer?: string;
  genre?: Genre;
  imageMainUrl?: string;
  address?: string;
  durationMinutes?: number;
  totalSeats?: number;
  remainingSeats?: number;
  status?: ConcertStatus;
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
