import { describe, expect, it } from "vitest";
import {
  bookingQrPlaceholder,
  canFetchTicketQr,
  displayBookingText,
  formatPaymentAmount,
  formatPerformanceSchedule,
  getBookingTab,
  isRefundableBooking,
  paymentCompleteHeading,
  showScheduleToMs,
  toShowDateTime,
} from "./booking";

describe("getBookingTab", () => {
  const now = new Date("2026-05-22T03:00:00.000Z");

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
    const late = new Date("2026-05-22T14:00:00.000Z");
    expect(getBookingTab({ performanceDate: "2026-05-22" }, late)).toBe(
      "upcoming",
    );
    expect(getBookingTab({ performanceDate: "2026-05-21" }, now)).toBe("past");
  });

  it("날짜가 없으면 upcoming이다", () => {
    expect(getBookingTab({ performanceDate: "" }, now)).toBe("upcoming");
  });

  it("브라우저 TZ와 무관하게 Seoul 오늘로 날짜만 비교한다 (#259)", () => {
    const nowUtc = new Date("2026-05-22T16:00:00.000Z");
    expect(getBookingTab({ performanceDate: "2026-05-22" }, nowUtc)).toBe(
      "past",
    );
    expect(getBookingTab({ performanceDate: "2026-05-23" }, nowUtc)).toBe(
      "upcoming",
    );
  });
});

describe("isRefundableBooking", () => {
  const now = new Date("2026-05-22T03:00:00.000Z");

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

  it("시각이 없으면 날짜 일수로 7일을 본다", () => {
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

  it("Seoul 달력 기준으로 D-7을 본다 (#259)", () => {
    const nowUtc = new Date("2026-05-22T16:00:00.000Z");
    expect(
      isRefundableBooking(
        { status: "CONFIRMED", performanceDate: "2026-05-30" },
        nowUtc,
      ),
    ).toBe(true);
    expect(
      isRefundableBooking(
        { status: "CONFIRMED", performanceDate: "2026-05-29" },
        nowUtc,
      ),
    ).toBe(false);
  });
});

describe("toShowDateTime / showScheduleToMs", () => {
  it("서울 벽시계를 Instant로 파싱한다", () => {
    expect(showScheduleToMs("2026-05-22", "19:30:00")).toBe(
      Date.parse("2026-05-22T19:30:00+09:00"),
    );
    expect(toShowDateTime("2026-05-22", "19:30:00").getTime()).toBe(
      Date.parse("2026-05-22T19:30:00+09:00"),
    );
  });

  it("시간이 없으면 서울 해당일 00:00이다", () => {
    expect(showScheduleToMs("2026-05-22")).toBe(
      Date.parse("2026-05-22T00:00:00+09:00"),
    );
  });
});

describe("formatPerformanceSchedule", () => {
  it("달력 필드를 그대로 붙인다", () => {
    expect(formatPerformanceSchedule("2026-05-22", "19:30:00")).toBe(
      "2026-05-22 19:30",
    );
    expect(formatPerformanceSchedule("2026-05-22")).toBe("2026-05-22");
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
    expect(paymentCompleteHeading("CANCELED").title).toContain(
      "확인할 수 없습니다",
    );
  });
});

describe("displayBookingText", () => {
  it("빈 값은 - 로 표시한다", () => {
    expect(displayBookingText("")).toBe("-");
    expect(displayBookingText("  ")).toBe("-");
    expect(displayBookingText("A-1")).toBe("A-1");
  });
});
