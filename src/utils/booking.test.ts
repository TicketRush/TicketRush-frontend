import { describe, expect, it } from "vitest";
import {
  bookingQrPlaceholder,
  canFetchTicketQr,
  displayBookingText,
  formatPaymentAmount,
  getBookingTab,
  isRefundableBooking,
  paymentCompleteHeading,
  toShowDateTime,
} from "./booking";

describe("getBookingTab", () => {
  const now = new Date(2026, 4, 22, 12, 0, 0);

  it("시간이 있으면 공연 시작 시각으로 분기한다", () => {
    expect(
      getBookingTab(
        { performanceDate: "2026-05-22", performanceTime: "19:30:00" },
        now,
      ),
    ).toBe("upcoming");
    expect(
      getBookingTab(
        { performanceDate: "2026-05-22", performanceTime: "10:00:00" },
        now,
      ),
    ).toBe("past");
  });

  it("목록처럼 시간이 없으면 공연 날짜만으로 분기한다", () => {
    const late = new Date(2026, 4, 22, 23, 0, 0);
    expect(getBookingTab({ performanceDate: "2026-05-22" }, late)).toBe(
      "upcoming",
    );
    expect(getBookingTab({ performanceDate: "2026-05-21" }, now)).toBe("past");
  });

  it("날짜가 없으면 upcoming이다", () => {
    expect(getBookingTab({ performanceDate: "" }, now)).toBe("upcoming");
  });
});

describe("isRefundableBooking", () => {
  const now = new Date(2026, 4, 22, 12, 0, 0);

  it("시각이 있으면 공연 시작 시각 기준 7일이다", () => {
    expect(
      isRefundableBooking(
        {
          status: "CONFIRMED",
          performanceDate: "2026-05-29",
          performanceTime: "19:30:00",
        },
        now,
      ),
    ).toBe(true);
    expect(
      isRefundableBooking(
        {
          status: "CONFIRMED",
          performanceDate: "2026-05-29",
          performanceTime: "10:00:00",
        },
        now,
      ),
    ).toBe(false);
  });

  it("시각이 없으면 자정으로 단축하지 않고 날짜 일수로 7일을 본다", () => {
    expect(
      isRefundableBooking(
        { status: "CONFIRMED", performanceDate: "2026-05-29" },
        now,
      ),
    ).toBe(true);
    expect(
      isRefundableBooking(
        { status: "CONFIRMED", performanceDate: "2026-05-28" },
        now,
      ),
    ).toBe(false);
  });

  it("날짜가 없거나 CONFIRMED가 아니면 환불 불가이다", () => {
    expect(
      isRefundableBooking({ status: "CONFIRMED", performanceDate: "" }, now),
    ).toBe(false);
    expect(
      isRefundableBooking(
        { status: "PENDING", performanceDate: "2026-05-29" },
        now,
      ),
    ).toBe(false);
  });
});

describe("toShowDateTime", () => {
  it("HH:mm:ss를 로컬 시각으로 파싱한다", () => {
    const d = toShowDateTime("2026-05-22", "19:30:00");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
  });

  it("시간이 없으면 해당일 00:00이다", () => {
    const d = toShowDateTime("2026-05-22");
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe("formatPaymentAmount", () => {
  it("금액이 없으면 0으로 폴백하지 않는다", () => {
    expect(formatPaymentAmount(undefined)).toBe("-");
    expect(formatPaymentAmount(null)).toBe("-");
    expect(formatPaymentAmount(150000)).toBe("₩150,000");
  });
});

describe("canFetchTicketQr", () => {
  it("CONFIRMED만 QR을 조회한다", () => {
    expect(canFetchTicketQr("CONFIRMED")).toBe(true);
    expect(canFetchTicketQr("PENDING")).toBe(false);
    expect(canFetchTicketQr("CANCELED")).toBe(false);
  });
});

describe("bookingQrPlaceholder", () => {
  it("PENDING은 결제 완료 후 발급 안내를 한다", () => {
    expect(bookingQrPlaceholder("PENDING")).toContain("결제 완료");
  });
});

describe("paymentCompleteHeading", () => {
  it("CONFIRMED만 결제 완료로 표시한다", () => {
    expect(paymentCompleteHeading("CONFIRMED").title).toBe("결제 완료!");
    expect(paymentCompleteHeading("PENDING").title).toBe("결제 대기 중");
    expect(paymentCompleteHeading("CANCELED").title).toContain("확인할 수 없습니다");
  });
});

describe("displayBookingText", () => {
  it("빈 값은 - 로 표시한다", () => {
    expect(displayBookingText("")).toBe("-");
    expect(displayBookingText("  ")).toBe("-");
    expect(displayBookingText("A-1")).toBe("A-1");
  });
});
