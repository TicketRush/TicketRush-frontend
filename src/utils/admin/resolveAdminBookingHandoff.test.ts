import { describe, expect, it } from "vitest";
import {
  parseAdminBookingHandoff,
  resolveAdminBookingHandoff,
} from "./resolveAdminBookingHandoff";
import type { BookingStatus } from "@/types/domain/booking";

function item(bookingNumber: string, status: BookingStatus) {
  return { bookingNumber, status };
}

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
      refundTarget: null,
      refundBlocked: false,
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
      refundTarget: null,
      refundBlocked: false,
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
    });
  });

  it("intent=refund이고 목록에 없으면 예매번호만으로 모달을 연다", () => {
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        [confirmed],
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: "OFF-PAGE",
      refundBlocked: false,
    });
    expect(
      resolveAdminBookingHandoff(
        { bookingNumber: "OFF-PAGE", intentRefund: true },
        undefined,
      ),
    ).toEqual({
      expandBookingNumber: null,
      refundTarget: "OFF-PAGE",
      refundBlocked: false,
    });
  });
});
