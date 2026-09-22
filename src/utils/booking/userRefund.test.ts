import { afterEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type {
  BookingDetail,
  BookingListItem,
  MyBookingsResponse,
} from "@/types/domain/booking";
import { withVisibleMyBookings } from "@/utils/booking";
import {
  applyRefundRequestedToBookingCaches,
  markBookingRefundRequested,
  nextStatusAfterUserBookingDelete,
  overlayBookingDetail,
  overlayMyBookingsResponse,
  overlayRequestedRefundStatus,
  clearRequestedRefunds,
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
