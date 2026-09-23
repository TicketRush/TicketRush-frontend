import { afterEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type {
  BookingDetail,
  BookingListItem,
  MyBookingsResponse,
} from "@/types/domain/booking";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { ApiError } from "@/api/errors/errorMapper";
import { withVisibleMyBookings } from "@/utils/booking";
import {
  applyRefundRequestedToBookingCaches,
  applyUserRefundDeleteError,
  markBookingRefundRequested,
  nextStatusAfterUserBookingDelete,
  overlayBookingDetail,
  overlayMyBookingsResponse,
  overlayRequestedRefundStatus,
  clearRequestedRefunds,
  clearRefundDeadlinePassed,
  clearRefundPerformanceLookup,
  clearRefundRejectionSession,
  isRefundDeadlinePassed,
  isRefundPerformanceUnavailable,
  withRequestedRefunds,
} from "./userRefund";

const item = (
  bookingNumber: string,
  status: BookingListItem["status"],
): BookingListItem => ({
  bookingId: 1,
  bookingNumber,
  status,
  performanceTitle: "공연",
  performanceVenue: "서울",
  performanceDate: "2027-01-01",
  seatNumber: "A-1",
  createdAt: "2026-09-01T00:00:00Z",
});

afterEach(() => {
  clearRequestedRefunds();
  clearRefundDeadlinePassed();
  clearRefundPerformanceLookup();
});

describe("nextStatusAfterUserBookingDelete", () => {
  it("PENDING은 취소, CONFIRMED는 환불 신청이다", () => {
    expect(nextStatusAfterUserBookingDelete("PENDING")).toBe("CANCELED");
    expect(nextStatusAfterUserBookingDelete("CONFIRMED")).toBe("REFUNDING");
  });

  it("그 외 상태에서는 삭제 호출이 허용되지 않는다", () => {
    expect(nextStatusAfterUserBookingDelete("CANCELED")).toBeNull();
    expect(nextStatusAfterUserBookingDelete("REFUNDING")).toBeNull();
    expect(nextStatusAfterUserBookingDelete("REFUNDED")).toBeNull();
    expect(nextStatusAfterUserBookingDelete("EXPIRED")).toBeNull();
  });
});

describe("overlayRequestedRefundStatus", () => {
  const requested = new Set(["A"]);

  it("신청한 CONFIRMED만 REFUNDING으로 덮는다", () => {
    expect(overlayRequestedRefundStatus("CONFIRMED", "A", requested)).toBe(
      "REFUNDING",
    );
    expect(overlayRequestedRefundStatus("CONFIRMED", "B", requested)).toBe(
      "CONFIRMED",
    );
    expect(overlayRequestedRefundStatus("PENDING", "A", requested)).toBe(
      "PENDING",
    );
  });
});

describe("withRequestedRefunds / markBookingRefundRequested", () => {
  it("목록에서 해당 예매만 REFUNDING으로 바꾼다", () => {
    const items = [item("A", "CONFIRMED"), item("B", "CONFIRMED")];
    expect(withRequestedRefunds(items, new Set(["A"]))).toEqual([
      item("A", "REFUNDING"),
      item("B", "CONFIRMED"),
    ]);
    expect(markBookingRefundRequested(item("A", "PENDING"), "A").status).toBe(
      "PENDING",
    );
  });

  it("바꿀 항목이 없으면 같은 배열을 돌려준다", () => {
    const items = [item("A", "REFUNDING"), item("B", "CONFIRMED")];
    expect(withRequestedRefunds(items, new Set(["A"]))).toBe(items);
  });
});

describe("applyRefundRequestedToBookingCaches", () => {
  it("내 예매 목록과 상세 캐시를 즉시 REFUNDING으로 맞춘다", () => {
    const qc = new QueryClient();
    const list: MyBookingsResponse = {
      items: [item("A", "CONFIRMED"), item("B", "CONFIRMED")],
      hasNext: false,
    };
    qc.setQueryData(queryKeys.bookings.mine({ page: 0, size: 100 }), list);
    qc.setQueryData(queryKeys.bookings.detail("A"), {
      bookingNumber: "A",
      status: "CONFIRMED",
    } as BookingDetail);

    applyRefundRequestedToBookingCaches(qc, "A");

    const next = qc.getQueryData<MyBookingsResponse>(
      queryKeys.bookings.mine({ page: 0, size: 100 }),
    );
    expect(next?.items.map((i) => i.status)).toEqual(["REFUNDING", "CONFIRMED"]);
    expect(qc.getQueryData<BookingDetail>(queryKeys.bookings.detail("A"))?.status).toBe(
      "REFUNDING",
    );
  });

  it("무한 페이지 캐시도 REFUNDING으로 맞춘다", () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.bookings.mine({ size: 50 }), {
      pages: [
        { items: [item("A", "CONFIRMED")], hasNext: true },
        { items: [item("B", "CONFIRMED")], hasNext: false },
      ],
      pageParams: [0, 1],
    });

    applyRefundRequestedToBookingCaches(qc, "A");

    const next = qc.getQueryData<{
      pages: MyBookingsResponse[];
    }>(queryKeys.bookings.mine({ size: 50 }));
    expect(next?.pages[0]?.items.map((row) => row.status)).toEqual(["REFUNDING"]);
    expect(next?.pages[1]?.items.map((row) => row.status)).toEqual(["CONFIRMED"]);
  });

  it("재조회가 다시 CONFIRMED를 줘도 신청 건은 REFUNDING으로 남는다", () => {
    applyRefundRequestedToBookingCaches(new QueryClient(), "A");
    const refetched: MyBookingsResponse = {
      items: [item("A", "CONFIRMED"), item("B", "CONFIRMED")],
      hasNext: false,
    };
    expect(overlayMyBookingsResponse(refetched).items.map((i) => i.status)).toEqual(
      ["REFUNDING", "CONFIRMED"],
    );
    expect(
      overlayBookingDetail({
        bookingNumber: "A",
        status: "CONFIRMED",
      } as BookingDetail).status,
    ).toBe("REFUNDING");
  });

  it("기억을 지우면 덮어쓰기를 멈춘다", () => {
    applyRefundRequestedToBookingCaches(new QueryClient(), "A");
    clearRequestedRefunds();
    expect(
      overlayMyBookingsResponse({
        items: [item("A", "CONFIRMED")],
        hasNext: false,
      }).items[0].status,
    ).toBe("CONFIRMED");
  });
});

function api(code: string, httpStatus = 409) {
  return new ApiError(
    { isSuccess: false, code, message: "서버 문구", result: null },
    httpStatus,
  );
}

describe("applyUserRefundDeleteError (#370)", () => {
  it("마감 거절은 그 예매의 환불 버튼만 끈다", () => {
    const error = applyUserRefundDeleteError(
      "A",
      api(ERROR_CODES.BOOKING_REFUND_DEADLINE_PASSED),
    );

    expect(isRefundDeadlinePassed("A")).toBe(true);
    expect(isRefundDeadlinePassed("B")).toBe(false);
    expect(error.message).toBe("서버 문구");
    expect(isRefundPerformanceUnavailable("A")).toBe(false);
  });

  it("공연 정보 503은 첫 실패에서 재시도 문구를 유지한다", () => {
    const error = applyUserRefundDeleteError(
      "A",
      api(ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED, 503),
    );

    expect(isRefundPerformanceUnavailable("A")).toBe(false);
    expect(error.message).toBe(
      "공연 정보를 확인하지 못해 환불할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("같은 예매의 두 번째 503은 버튼을 끄고 재시도 안내를 뺀다", () => {
    applyUserRefundDeleteError(
      "A",
      api(ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED, 503),
    );
    const error = applyUserRefundDeleteError(
      "A",
      api(ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED, 503),
    );

    expect(isRefundPerformanceUnavailable("A")).toBe(true);
    expect(isRefundPerformanceUnavailable("B")).toBe(false);
    expect(error.message).toBe(
      "공연 정보를 확인할 수 없어 지금은 환불할 수 없습니다.",
    );
  });

  it("다른 오류는 환불 버튼을 바꾸지 않는다", () => {
    applyUserRefundDeleteError("A", api(ERROR_CODES.BOOKING_NOT_FOUND, 404));
    expect(isRefundDeadlinePassed("A")).toBe(false);
    expect(isRefundPerformanceUnavailable("A")).toBe(false);
  });

  it("로그아웃하면 마감·공연 정보 실패 기록을 지운다", () => {
    applyUserRefundDeleteError(
      "A",
      api(ERROR_CODES.BOOKING_REFUND_DEADLINE_PASSED),
    );
    applyUserRefundDeleteError(
      "B",
      api(ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED, 503),
    );
    applyUserRefundDeleteError(
      "B",
      api(ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED, 503),
    );

    clearRefundRejectionSession();

    expect(isRefundDeadlinePassed("A")).toBe(false);
    expect(isRefundPerformanceUnavailable("B")).toBe(false);
  });
});

describe("overlay + 내 예매 노출 (#339)", () => {
  it("방금 신청한 환불 건은 목록에서 빠지지 않는다", () => {
    applyRefundRequestedToBookingCaches(new QueryClient(), "A");
    const next = withVisibleMyBookings(
      overlayMyBookingsResponse({
        items: [item("A", "CONFIRMED"), item("B", "PENDING")],
        hasNext: false,
      }),
    );
    expect(next.items.map((i) => i.status)).toEqual(["REFUNDING"]);
  });
});
