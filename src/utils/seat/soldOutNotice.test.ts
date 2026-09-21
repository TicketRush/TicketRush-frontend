import { describe, expect, it } from "vitest";
import {
  getSaleEndedNoticeKind,
  getSeatExitNoticeCopy,
  getSoldOutNoticeKind,
  resolveSeatExitNotice,
  shouldNotifySeatTaken,
  shouldShowSoldOutNotice,
  seatMapHasAvailable,
  SOLD_OUT_NOTICE_COPY,
} from "./soldOutNotice";
import type { SeatMapData, SeatWithStatus } from "@/types/domain/seat";

function seat(
  id: number,
  status: SeatWithStatus["status"],
): SeatWithStatus {
  return {
    id,
    seatLayoutId: 1,
    seatNumber: `A-${id}`,
    row: "A",
    col: id,
    status,
  };
}

describe("getSoldOutNoticeKind", () => {
  it("잔여가 있으면 null이다", () => {
    expect(
      getSoldOutNoticeKind({ availableCount: 1, holdCount: 0 }),
    ).toBeNull();
  });

  it("잔여 0 + 임시예매가 있으면 결제 중 마감이다", () => {
    expect(
      getSoldOutNoticeKind({ availableCount: 0, holdCount: 2 }),
    ).toBe("holding");
    expect(SOLD_OUT_NOTICE_COPY.holding.message).toContain("결제 대기");
  });

  it("잔여 0 + 임시예매도 없으면 매진이다", () => {
    expect(
      getSoldOutNoticeKind({ availableCount: 0, holdCount: 0 }),
    ).toBe("sold");
    expect(SOLD_OUT_NOTICE_COPY.sold.message).toContain(
      "준비된 좌석이 모두 매진되어 이전 페이지로 이동합니다.",
    );
  });
});

describe("shouldShowSoldOutNotice", () => {
  const base = {
    hasEntered: true,
    remaining: 0 as const,
    isOwnHoldInFlight: false,
    mapHasAvailable: false as boolean | null,
  };

  it("입장 후·잔여 0·맵에도 예매 가능이 없을 때만 연다", () => {
    expect(shouldShowSoldOutNotice({ ...base, hasEntered: false })).toBe(
      false,
    );
    expect(shouldShowSoldOutNotice({ ...base, isOwnHoldInFlight: true })).toBe(
      false,
    );
    expect(shouldShowSoldOutNotice({ ...base, mapHasAvailable: true })).toBe(
      false,
    );
    expect(shouldShowSoldOutNotice({ ...base, mapHasAvailable: null })).toBe(
      false,
    );
    expect(shouldShowSoldOutNotice(base)).toBe(true);
  });
});

describe("seatMapHasAvailable", () => {
  it("맵이 없으면 모르고, 예매 가능 칸이 있는지로 판단한다", () => {
    expect(seatMapHasAvailable(undefined)).toBeNull();
    const map: SeatMapData = {
      layout: null,
      layoutReady: true,
      seats: [seat(1, "HOLD")],
    };
    expect(seatMapHasAvailable(map)).toBe(false);
    expect(
      seatMapHasAvailable({
        ...map,
        seats: [seat(1, "HOLD"), seat(2, "AVAILABLE")],
      }),
    ).toBe(true);
  });
});

describe("shouldNotifySeatTaken", () => {
  it("잔여 0이고 맵에 고를 칸이 없으면 토스트를 내지 않는다", () => {
    expect(
      shouldNotifySeatTaken({ remaining: 0, mapHasAvailable: false }),
    ).toBe(false);
    expect(
      shouldNotifySeatTaken({ remaining: 0, mapHasAvailable: null }),
    ).toBe(false);
  });

  it("맵에 예매 가능이 남아 있으면 다른 좌석 안내를 한다", () => {
    expect(
      shouldNotifySeatTaken({ remaining: 0, mapHasAvailable: true }),
    ).toBe(true);
    expect(
      shouldNotifySeatTaken({ remaining: 2, mapHasAvailable: false }),
    ).toBe(true);
  });

  it("판매가 끝나면 잔여가 없어도 토스트를 내지 않는다", () => {
    expect(
      shouldNotifySeatTaken({
        remaining: null,
        mapHasAvailable: true,
        concertStatus: "CLOSED",
      }),
    ).toBe(false);
    expect(
      shouldNotifySeatTaken({
        remaining: 2,
        mapHasAvailable: true,
        concertStatus: "UPCOMING",
      }),
    ).toBe(false);
  });
});

describe("getSaleEndedNoticeKind", () => {
  it("판매 중이면 null이고, 상태별로 안내를 나눈다", () => {
    expect(getSaleEndedNoticeKind("ON_SALE")).toBeNull();
    expect(getSaleEndedNoticeKind(undefined)).toBeNull();
    expect(getSaleEndedNoticeKind("CLOSED")).toBe("closed");
    expect(getSaleEndedNoticeKind("UPCOMING")).toBe("upcoming");
    expect(getSaleEndedNoticeKind("CANCELED")).toBe("canceled");
    expect(SOLD_OUT_NOTICE_COPY.closed.message).toContain("예매가 마감");
    expect(SOLD_OUT_NOTICE_COPY.canceled.message).toContain("취소");
    expect(SOLD_OUT_NOTICE_COPY.upcoming.message).toContain("오픈일");
  });
});

describe("getSeatExitNoticeCopy", () => {
  it("오픈 예정이면 마감 문구를 쓰지 않는다", () => {
    expect(getSeatExitNoticeCopy("upcoming").message).toBe(
      "본 공연의 티켓 오픈일이 곧 공개됩니다.",
    );
    expect(getSeatExitNoticeCopy("upcoming").message).not.toContain("마감");
    expect(getSeatExitNoticeCopy("closed").message).toContain("예매가 마감");
  });
});

describe("resolveSeatExitNotice", () => {
  const counts = { availableCount: 0, holdCount: 2 };

  it("조건이 아니면 열린 안내는 닫는다", () => {
    expect(
      resolveSeatExitNotice({
        hasEntered: true,
        concertStatus: "ON_SALE",
        remaining: 0,
        isOwnHoldInFlight: false,
        mapHasAvailable: true,
        counts,
      }),
    ).toBeNull();
  });

  it("판매가 끝나면 잔여와 무관하게 상태 안내를 연다", () => {
    expect(
      resolveSeatExitNotice({
        hasEntered: true,
        concertStatus: "CLOSED",
        remaining: 4,
        isOwnHoldInFlight: false,
        mapHasAvailable: true,
        counts: { availableCount: 4, holdCount: 0 },
      }),
    ).toBe("closed");
    expect(
      resolveSeatExitNotice({
        hasEntered: true,
        concertStatus: "UPCOMING",
        remaining: 4,
        isOwnHoldInFlight: false,
        mapHasAvailable: true,
        counts: { availableCount: 4, holdCount: 0 },
      }),
    ).toBe("upcoming");
    expect(
      resolveSeatExitNotice({
        hasEntered: true,
        concertStatus: "CANCELED",
        remaining: 0,
        isOwnHoldInFlight: true,
        mapHasAvailable: false,
        counts,
      }),
    ).toBeNull();
  });

  it("입장 후 잔여 0이고 맵에도 없으면 매진/결제대기 안내를 연다", () => {
    expect(
      resolveSeatExitNotice({
        hasEntered: true,
        concertStatus: "ON_SALE",
        remaining: 0,
        isOwnHoldInFlight: false,
        mapHasAvailable: false,
        counts,
      }),
    ).toBe("holding");
  });
});
