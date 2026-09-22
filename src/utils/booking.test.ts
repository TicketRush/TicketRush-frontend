import { describe, expect, it } from "vitest";
import {
  MY_PAGE_BOOKING_STATUSES,
  type BookingListItem,
} from "@/types/domain/booking";
import {
  bookingQrPlaceholder,
  canFetchTicketQr,
  displayBookingText,
  filterBookingsByTab,
  filterVisibleMyBookings,
  formatPaymentAmount,
  formatPerformanceSchedule,
  getBookingTab,
  isRefundableBooking,
  isVisibleOnMyBookings,
  userBookingStatusLabel,
  paymentCompleteHeading,
  showScheduleToMs,
  sumMyPageBookingCounts,
  ticketDetailHeading,
  toShowDateTime,
  withVisibleMyBookings,
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

describe("userBookingStatusLabel", () => {
  it("REFUNDING은 환불 신청 완료로 표시한다", () => {
    expect(userBookingStatusLabel("REFUNDING")).toBe("환불 신청 완료");
    expect(userBookingStatusLabel("REFUNDED")).toBe("환불 완료");
    expect(userBookingStatusLabel("CONFIRMED")).toBe("예매 확정");
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

  it("환불 상태면 입장 QR 대신 환불 안내를 한다", () => {
    expect(bookingQrPlaceholder("REFUNDING")).toContain("환불 신청");
    expect(bookingQrPlaceholder("REFUNDED")).toContain("환불");
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

describe("ticketDetailHeading", () => {
  it("CONFIRMED만 티켓 확인으로 표시한다", () => {
    expect(ticketDetailHeading("CONFIRMED").title).toBe("티켓 확인");
    expect(ticketDetailHeading("PENDING").title).toBe("결제 대기 중");
    expect(ticketDetailHeading("CANCELED").title).toContain("입장할 수 없는");
    expect(ticketDetailHeading("REFUNDED").title).toContain("환불 완료");
    expect(ticketDetailHeading("REFUNDING").title).toBe("환불 신청 완료");
  });
});

describe("displayBookingText", () => {
  it("빈 값은 - 로 표시한다", () => {
    expect(displayBookingText("")).toBe("-");
    expect(displayBookingText("  ")).toBe("-");
    expect(displayBookingText("A-1")).toBe("A-1");
  });
});

describe("isVisibleOnMyBookings (#339)", () => {
  it("확정·환불 신청·환불 완료만 내 예매에 남긴다", () => {
    expect(MY_PAGE_BOOKING_STATUSES).toEqual([
      "CONFIRMED",
      "REFUNDING",
      "REFUNDED",
    ]);
    expect(isVisibleOnMyBookings("CONFIRMED")).toBe(true);
    expect(isVisibleOnMyBookings("REFUNDING")).toBe(true);
    expect(isVisibleOnMyBookings("REFUNDED")).toBe(true);
    expect(isVisibleOnMyBookings("PENDING")).toBe(false);
    expect(isVisibleOnMyBookings("CANCELED")).toBe(false);
    expect(isVisibleOnMyBookings("EXPIRED")).toBe(false);
  });

  it("목록·총 예매 수에서 임시예매와 미결제 취소를 뺀다", () => {
    const item = (
      bookingId: number,
      status: BookingListItem["status"],
      date: string,
    ): BookingListItem => ({
      bookingId,
      bookingNumber: `N-${bookingId}`,
      status,
      performanceTitle: `공연-${status}`,
      performanceVenue: "서울",
      performanceDate: date,
      seatNumber: "A-1",
      createdAt: "2026-09-01T00:00:00Z",
    });
    const items = [
      item(1, "CONFIRMED", "2099-01-01"),
      item(2, "PENDING", "2099-01-02"),
      item(3, "CANCELED", "2099-01-03"),
      item(4, "EXPIRED", "2020-01-01"),
      item(5, "REFUNDING", "2099-01-04"),
      item(6, "REFUNDED", "2020-01-02"),
    ];
    const visible = filterVisibleMyBookings(items);
    expect(visible.map((b) => b.status)).toEqual([
      "CONFIRMED",
      "REFUNDING",
      "REFUNDED",
    ]);

    const now = new Date("2026-09-22T03:00:00.000Z");
    expect(
      filterBookingsByTab(visible, "upcoming", now).map((b) => b.status),
    ).toEqual(["CONFIRMED", "REFUNDING"]);
    expect(
      filterBookingsByTab(visible, "past", now).map((b) => b.status),
    ).toEqual(["REFUNDED"]);

    const data = { items, hasNext: false };
    expect(withVisibleMyBookings(data).items).toEqual(visible);
    expect(
      withVisibleMyBookings({ items: visible, hasNext: false }).items,
    ).toBe(visible);
  });
});

describe("sumMyPageBookingCounts (#339)", () => {
  it("상태별 count를 합친다", () => {
    expect(
      sumMyPageBookingCounts([{ count: 2 }, { count: 1 }, { count: 4 }]),
    ).toBe(7);
    expect(sumMyPageBookingCounts([])).toBe(0);
  });
});
