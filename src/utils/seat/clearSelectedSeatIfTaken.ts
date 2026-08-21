import { toast } from "@/utils/toast";
import useSeatStore from "@/stores/reservation/seatStore";
import type { SeatStatus } from "@/types/domain/seat";

const SEAT_TAKEN_TOAST =
  "선택하신 좌석이 다른 사용자에게 선점되었습니다. 다른 좌석을 선택해 주세요.";

/**
 * 선택 좌석이 AVAILABLE이 아니면 해제.
 * @returns 실제로 선택을 해제했는지
 */
export function clearSelectedSeatIfTaken(
  seatId: number,
  status: SeatStatus,
  options?: {
    /** 내 좌석 확인(HOLD) 진행 중이면 true — 해제/토스트 스킵 */
    preserve?: boolean;
    /** 해제 시 안내 토스트 (기본 true) */
    notify?: boolean;
  },
): boolean {
  if (status === "AVAILABLE") return false;
  if (options?.preserve) return false;

  const selected = useSeatStore.getState().selectedSeat;
  if (selected?.id !== seatId) return false;

  useSeatStore.getState().reset();
  if (options?.notify !== false) {
    toast.info(SEAT_TAKEN_TOAST, { position: "top-center" });
  }
  return true;
}
