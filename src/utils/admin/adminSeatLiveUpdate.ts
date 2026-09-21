import type { SeatStatus } from "@/types/domain/seat";

/** 맵 SSE가 더 빠르면 맵 상태를 우선한다. */
export function resolveAdminDetailViewStatus(
  mapStatus: SeatStatus | undefined,
  detailStatus: SeatStatus | undefined,
): SeatStatus | undefined {
  return mapStatus ?? detailStatus;
}

/** 맵은 SOLD인데 상세가 아직 HOLD면 예매자/시각을 갱신 중으로 둔다 (#361). */
export function isAdminSoldDetailPending(
  mapStatus: SeatStatus | undefined,
  detailStatus: SeatStatus | undefined,
): boolean {
  return mapStatus === "SOLD" && detailStatus === "HOLD";
}

/** 맵 SSE 반영 후 선택 좌석 상세를 어떻게 맞출지. */
export function resolveSelectedSeatLiveUpdate(args: {
  selectedSeatId: number | null;
  selectedStatus: SeatStatus | undefined;
  prevSeatId: number | null;
  prevStatus: SeatStatus | undefined;
}): "clear" | "refetch" | "keep" {
  if (args.selectedSeatId == null) return "keep";
  if (args.selectedStatus === "AVAILABLE") return "clear";
  if (
    args.prevSeatId === args.selectedSeatId &&
    args.selectedStatus &&
    args.prevStatus &&
    args.prevStatus !== args.selectedStatus
  ) {
    return "refetch";
  }
  return "keep";
}
