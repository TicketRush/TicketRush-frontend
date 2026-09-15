import { describe, expect, it } from "vitest";
import {
  mapAdminBooking,
  mapAdminBookingStats,
  type BookingAdminSummaryResponse,
} from "./adminBookingMapper";

const COMPLETE_ROW: BookingAdminSummaryResponse = {
  bookingId: 1,
  bookingNumber: "X7B29-KLPW1",
  userId: 5,
  performanceId: 10,
  seatId: 100,
  bookingStatus: "CONFIRMED",
  bookedAt: "2026-05-22 10:30:00",
  performanceTitle: "오페라의 유령",
  performanceDate: "2026-05-22",
  bookerName: "김소희",
  bookerEmail: "user@example.com",
  seatNumber: "A-1",
  seatCount: 1,
  paymentAmount: 150000,
};

describe("mapAdminBooking", () => {
  it("BE 필드를 화면 타입으로 옮기고 단가와 총액을 paymentAmount로 맞춘다", () => {
    expect(mapAdminBooking(COMPLETE_ROW)).toEqual({
      bookingId: 1,
      bookingNumber: "X7B29-KLPW1",
      userId: 5,
      performanceId: 10,
      seatId: 100,
      concertTitle: "오페라의 유령",
      concertDate: "2026-05-22",
      bookedAt: "2026-05-22 10:30:00",
      userName: "김소희",
      userEmail: "user@example.com",
      seatNumbers: ["A-1"],
      seatCount: 1,
      unitPrice: 150000,
      totalAmount: 150000,
      status: "CONFIRMED",
    });
  });

  it("보강 필드와 결제 금액이 생략되면 null·빈 좌석으로 둔다", () => {
    const mapped = mapAdminBooking({
      bookingId: 2,
      bookingNumber: "X7B29-KLPW2",
      userId: 5,
      performanceId: 10,
      seatId: 101,
      bookingStatus: "PENDING",
      bookedAt: "2026-05-22 11:00:00",
      seatCount: 1,
    });

    expect(mapped.concertTitle).toBeNull();
    expect(mapped.concertDate).toBeNull();
    expect(mapped.userName).toBeNull();
    expect(mapped.userEmail).toBeNull();
    expect(mapped.seatNumbers).toEqual([]);
    expect(mapped.unitPrice).toBeNull();
    expect(mapped.totalAmount).toBeNull();
    expect(mapped.status).toBe("PENDING");
    expect(mapped.seatCount).toBe(1);
  });

  it("좌석 수가 생략되면 1인 1매라 1로 둔다", () => {
    const mapped = mapAdminBooking({
      bookingId: 3,
      bookingNumber: "X7B29-KLPW3",
      userId: 5,
      performanceId: 10,
      seatId: 102,
      bookingStatus: "CONFIRMED",
      bookedAt: "2026-05-22 12:00:00",
    });
    expect(mapped.seatCount).toBe(1);
  });
});

describe("mapAdminBookingStats", () => {
  it("빈 응답은 0·완전 집계로 둔다", () => {
    expect(mapAdminBookingStats(undefined)).toEqual({
      totalBookings: 0,
      completedBookings: 0,
      canceledBookings: 0,
      totalRevenue: 0,
      revenueComplete: true,
      missingAmountBookings: 0,
    });
  });

  it("매출 불완전 플래그를 그대로 옮긴다", () => {
    expect(
      mapAdminBookingStats({
        totalBookings: 10,
        completedBookings: 7,
        canceledBookings: 2,
        totalRevenue: 900000,
        revenueComplete: false,
        missingAmountBookings: 1,
      }),
    ).toEqual({
      totalBookings: 10,
      completedBookings: 7,
      canceledBookings: 2,
      totalRevenue: 900000,
      revenueComplete: false,
      missingAmountBookings: 1,
    });
  });
});
