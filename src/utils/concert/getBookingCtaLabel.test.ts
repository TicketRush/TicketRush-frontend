import { describe, expect, it } from "vitest";
import { getBookingCtaLabel } from "./getBookingCtaLabel";

describe("getBookingCtaLabel", () => {
  it("상태별 고정 문구를 반환한다", () => {
    expect(
      getBookingCtaLabel({ status: "UPCOMING", remaining: null }),
    ).toBe("오픈 예정");
    expect(
      getBookingCtaLabel({ status: "CANCELED", remaining: null }),
    ).toBe("공연 취소");
    expect(
      getBookingCtaLabel({ status: "CLOSED", remaining: null }),
    ).toBe("예매 마감");
  });

  it("ON_SALE 좌석 상태에 따라 문구를 나눈다", () => {
    expect(
      getBookingCtaLabel({
        status: "ON_SALE",
        seatsError: true,
        remaining: null,
      }),
    ).toBe("좌석 정보 확인 불가");

    expect(
      getBookingCtaLabel({
        status: "ON_SALE",
        seatsLoading: true,
        remaining: null,
      }),
    ).toBe("잔여 좌석 확인 중");

    expect(
      getBookingCtaLabel({
        status: "ON_SALE",
        remaining: null,
      }),
    ).toBe("잔여 좌석 확인 중");

    expect(
      getBookingCtaLabel({
        status: "ON_SALE",
        remaining: 0,
      }),
    ).toBe("매진");

    expect(
      getBookingCtaLabel({
        status: "ON_SALE",
        remaining: 12,
      }),
    ).toBe("예매하기");
  });

  it("비 ON_SALE에서는 좌석 플래그보다 상태를 우선한다", () => {
    expect(
      getBookingCtaLabel({
        status: "CLOSED",
        seatsError: true,
        seatsLoading: true,
        remaining: 0,
      }),
    ).toBe("예매 마감");
  });
});
