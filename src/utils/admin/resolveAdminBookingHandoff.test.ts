import { describe, expect, it } from "vitest";
import {
  parseAdminBookingHandoff,
  resolveAdminBookingHandoff,
} from "./resolveAdminBookingHandoff";
import type { BookingStatus } from "@/types/domain/booking";

function item(bookingNumber: string, status: BookingStatus) {
  return { bookingNumber, status };
}

const visible = {
  refundTarget: null as string | null,
  refundBlocked: false,
  listHidden: false,
};

describe("parseAdminBookingHandoff", () => {
  it("bookingNumber가 없으면 null이다", () => {
    expect(parseAdminBookingHandoff(new URLSearchParams())).toBeNull();
    expect(
      parseAdminBookingHandoff(new URLSearchParams("intent=refund")),
    ).toBeNull();
    expect(
      parseAdminBookingHandoff(new URLSearchParams("bookingNumber=%20")),
    ).toBeNull();
  });

  it("예매번호만 있으면 상세 연동만 한다", () => {
    expect(
      parseAdminBookingHandoff(
        new URLSearchParams("bookingNumber=X7B29-KLPW1"),
      ),
    ).toEqual({ bookingNumber: "X7B29-KLPW1", intentRefund: false });
  });

  it("intent=refund만 환불 모달 대상으로 본다", () => {
    expect(
      parseAdminBookingHandoff(
        new URLSearchParams("bookingNumber=X7B29-KLPW1&intent=refund"),
      ),
    ).toEqual({ bookingNumber: "X7B29-KLPW1", intentRefund: true });
    expect(
      parseAdminBookingHandoff(
        new URLSearchParams("bookingNumber=X7B29-KLPW1&intent=reserver"),
      ),
    ).toEqual({ bookingNumber: "X7B29-KLPW1", intentRefund: false });
  });
});

describe("resolveAdminBookingHandoff", () => {
  const confirmed = item("X7B29-KLPW1", "CONFIRMED");
  const pending = item("X7B29-KLPW2", "PENDING");

  it("현재 페이지에 있으면 상세를 연다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "X7B29-KLPW1", intentRefund: false },
        [confirmed, pending],
      ),
    ).toEqual({
      expandBookingNumber: "X7B29-KLPW1",
      ...visible,
    });
  });

  it("현재 페이지에 없으면 상세는 열지 않는다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "MISSING", intentRefund: false },
        [confirmed],
      ),
    ).toEqual({
      expandBookingNumber: null,
      ...visible,
    });
  });

  it("intent=refund이고 현재 페이지 CONFIRMED면 모달을 연다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "X7B29-KLPW1", intentRefund: true },
        [confirmed],
      ),
    ).toEqual({
      expandBookingNumber: "X7B29-KLPW1",
      refundTarget: "X7B29-KLPW1",
      refundBlocked: false,
      listHidden: false,
    });
  });

  it("intent=refund이고 현재 페이지가 CONFIRMED가 아니면 모달을 막는다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "X7B29-KLPW2", intentRefund: true },
        [pending],
      ),
    ).toEqual({
      expandBookingNumber: "X7B29-KLPW2",
      refundTarget: null,
      refundBlocked: true,
      listHidden: false,
    });
  });

  it("현재 페이지에 없는 예매 + intent=refund + 단건 CONFIRMED면 모달을 연다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        [confirmed],
        "CONFIRMED",
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: "OFF-PAGE",
      refundBlocked: false,
      listHidden: false,
    });
  });

  it("현재 페이지에 없는 예매 + intent=refund + 단건 PENDING/REFUNDED면 모달을 막는다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        [confirmed],
        "PENDING",
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: null,
      refundBlocked: true,
      listHidden: false,
    });
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        [confirmed],
        "REFUNDED",
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: null,
      refundBlocked: true,
      listHidden: false,
    });
  });

  it("현재 페이지에 없는 예매 + intent=refund + 단건 실패/상태 미확인이면 모달을 열지 않는다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        [confirmed],
      ),
    ).toEqual({
      expandBookingNumber: null,
      ...visible,
    });
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        undefined,
      ),
    ).toEqual({
      expandBookingNumber: null,
      ...visible,
    });
  });

  it("CANCELED·EXPIRED는 목록·Focus에 올리지 않는다 (#339)", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "GONE", intentRefund: false },
        [confirmed],
        "CANCELED",
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: null,
      refundBlocked: false,
      listHidden: true,
    });
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "GONE", intentRefund: true },
        undefined,
        "EXPIRED",
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: null,
      refundBlocked: true,
      listHidden: true,
    });
  });
});
