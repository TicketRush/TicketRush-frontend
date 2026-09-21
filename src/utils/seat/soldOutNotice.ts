import { formatBookingOpenAt } from "@/utils/concert/formatBookingOpenAt";
import type { ConcertStatus } from "@/types/domain/concert";
import type { SeatMapData } from "@/types/domain/seat";

export type SoldOutNoticeKind =
  | "sold"
  | "holding"
  | "closed"
  | "canceled"
  | "upcoming";

export const SOLD_OUT_NOTICE_COPY: Record<
  SoldOutNoticeKind,
  { title: string; message: string }
> = {
  sold: {
    title: "매진 안내",
    message: "준비된 좌석이 모두 매진되어 이전 페이지로 이동합니다.",
  },
  holding: {
    title: "예매 마감 안내",
    message:
      "남은 좌석이 현재 다른 고객님의 결제 대기 중이라 예매가 불가능합니다.",
  },
  closed: {
    title: "예매 마감 안내",
    message: "본 공연은 예매가 마감되었습니다.",
  },
  canceled: {
    title: "공연 취소 안내",
    message: "본 공연은 기획사 사정으로 취소되었습니다.",
  },
  upcoming: {
    title: "오픈 예정 안내",
    message: "본 공연의 티켓 오픈일이 곧 공개됩니다.",
  },
};

export function getSeatExitNoticeCopy(
  kind: SoldOutNoticeKind,
  bookingOpenAt?: string | null,
): { title: string; message: string } {
  if (kind !== "upcoming") return SOLD_OUT_NOTICE_COPY[kind];

  const formatted = bookingOpenAt ? formatBookingOpenAt(bookingOpenAt) : "";
  return {
    title: SOLD_OUT_NOTICE_COPY.upcoming.title,
    message: formatted
      ? `본 공연은 ${formatted}에 티켓 오픈됩니다.`
      : SOLD_OUT_NOTICE_COPY.upcoming.message,
  };
}

/** 맵에 예매 가능 좌석이 있는지. 맵이 없으면 아직 모름(null). */
export function seatMapHasAvailable(
  seatMap: SeatMapData | undefined,
): boolean | null {
  if (!seatMap?.seats) return null;
  return seatMap.seats.some((seat) => seat.status === "AVAILABLE");
}

/** 예매 가능 0이면 매진/결제대기 안내 종류. 잔여가 있으면 null. */
export function getSoldOutNoticeKind(counts: {
  availableCount: number;
  holdCount: number;
}): SoldOutNoticeKind | null {
  if (counts.availableCount > 0) return null;
  return counts.holdCount > 0 ? "holding" : "sold";
}

/** 입장 후 판매 상태가 바뀌면 매진 안내와 같은 확인 모달로 보낸다. */
export function getSaleEndedNoticeKind(
  status: ConcertStatus | undefined,
): Extract<SoldOutNoticeKind, "closed" | "canceled" | "upcoming"> | null {
  if (!status || status === "ON_SALE") return null;
  if (status === "CANCELED") return "canceled";
  if (status === "UPCOMING") return "upcoming";
  return "closed";
}

/**
 * 입장 후 잔여 0이고, 맵에도 예매 가능이 없으며, 내 선점 진행이 아닐 때만 연다.
 * 맵이 아직 없거나 초록 좌석이 남아 있으면 열지 않는다.
 */
export function shouldShowSoldOutNotice(params: {
  hasEntered: boolean;
  remaining: number | null;
  isOwnHoldInFlight: boolean;
  mapHasAvailable: boolean | null;
}): boolean {
  return (
    params.hasEntered &&
    params.remaining === 0 &&
    !params.isOwnHoldInFlight &&
    params.mapHasAvailable === false
  );
}

/**
 * 지금 띄울 퇴장 안내. 조건이 아니면 null — 이미 열린 모달도 닫는다.
 * 판매 종료(CLOSED/CANCELED/UPCOMING)가 잔여 0보다 우선한다.
 */
export function resolveSeatExitNotice(params: {
  hasEntered: boolean;
  concertStatus?: ConcertStatus;
  remaining: number | null;
  isOwnHoldInFlight: boolean;
  mapHasAvailable: boolean | null;
  counts?: { availableCount: number; holdCount: number };
}): SoldOutNoticeKind | null {
  if (!params.hasEntered || params.isOwnHoldInFlight) return null;

  const ended = getSaleEndedNoticeKind(params.concertStatus);
  if (ended) return ended;

  if (
    !shouldShowSoldOutNotice({
      hasEntered: true,
      remaining: params.remaining,
      isOwnHoldInFlight: false,
      mapHasAvailable: params.mapHasAvailable,
    }) ||
    !params.counts
  ) {
    return null;
  }

  return getSoldOutNoticeKind(params.counts);
}

/**
 * 퇴장 안내 모달이 뜰 상황이면 "다른 좌석을 선택해 주세요" 토스트를 내지 않는다.
 * 판매 종료(잔여가 null이 되는 CLOSED 포함)와 잔여 0+맵에 고를 칸 없음.
 */
export function shouldNotifySeatTaken(params: {
  remaining: number | null;
  mapHasAvailable: boolean | null;
  concertStatus?: ConcertStatus;
}): boolean {
  if (getSaleEndedNoticeKind(params.concertStatus)) return false;
  if (params.remaining === 0 && params.mapHasAvailable !== true) {
    return false;
  }
  return true;
}
