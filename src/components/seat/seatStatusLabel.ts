import type { SeatStatus } from "@/types/domain/seat";

export type SeatVisualStatus = SeatStatus | "SELECTED";

/** 범례·스크린리더에 쓰는 사용자 영역 좌석 상태 문구 (#102) */
export const SEAT_STATUS_LABEL: Record<SeatVisualStatus, string> = {
  AVAILABLE: "예매가능",
  HOLD: "임시예매",
  SOLD: "예매완료",
  SELECTED: "선택한 좌석",
};
