import { describe, expect, it } from "vitest";
import type { BookingListItem } from "@/types/domain/booking";
import {
  flattenMyBookingPages,
  mergeMyBookingsById,
  myBookingsHasMore,
  myBookingsPagesStalled,
  nextMyBookingsPageParam,
  pageItems,
  shouldPrefetchMyBookingsTab,
  uniqueMyBookingCount,
} from "./myBookingsPages";

const item = (
  bookingId: number,
  createdAt: string,
  extra: Partial<BookingListItem> = {},
): BookingListItem => ({
  bookingId,
  bookingNumber: `N-${bookingId}`,
  status: "CONFIRMED",
  performanceTitle: `공연-${bookingId}`,
  performanceVenue: "서울",
  performanceDate: "2099-01-01",
  seatNumber: "A-1",
  createdAt,
  ...extra,
});

describe("pageItems", () => {
  it("다음 페이지는 이미 받은 구간을 다시 포함하지 않는다", () => {
    const rows = [1, 2, 3, 4, 5].map((id) => item(id, `2026-09-0${id}T00:00:00Z`));
    const first = pageItems(rows, 0, 2);
    const second = pageItems(rows, 1, 2);
    expect(first.items.map((row) => row.bookingId)).toEqual([1, 2]);
    expect(first.hasNext).toBe(true);
    expect(second.items.map((row) => row.bookingId)).toEqual([3, 4]);
    expect(pageItems(rows, 2, 2).hasNext).toBe(false);
  });
});

describe("mergeMyBookingsById", () => {
  it("상태별 페이지를 합치고 최신순으로 두며 자르지 않는다", () => {
    const confirmed = [item(2, "2026-09-02T00:00:00Z"), item(1, "2026-09-01T00:00:00Z")];
    const refunded = [item(3, "2026-01-01T00:00:00Z", { status: "REFUNDED" })];
    const merged = mergeMyBookingsById(
      [confirmed, refunded],
      (row) => row.bookingId,
      (row) => row.createdAt ?? "",
    );
    expect(merged.map((row) => row.bookingId)).toEqual([2, 1, 3]);
  });
});

describe("flattenMyBookingPages", () => {
  it("페이지를 합칠 때 같은 예매는 한 번만 남긴다", () => {
    const pages = [
      { items: [item(1, "2026-09-02T00:00:00Z"), item(2, "2026-09-01T00:00:00Z")] },
      { items: [item(1, "2026-09-02T00:00:00Z"), item(3, "2026-08-01T00:00:00Z")] },
    ];
    expect(uniqueMyBookingCount(pages)).toBe(3);
    expect(flattenMyBookingPages(pages).map((row) => row.bookingId)).toEqual([
      1, 2, 3,
    ]);
  });
});

describe("myBookingsHasMore / prefetch", () => {
  it("hasNext가 없어도 총 건수가 더 많으면 이어 붙인다", () => {
    expect(
      myBookingsHasMore({
        hasNextPage: false,
        loadedCount: 50,
        totalCount: 80,
      }),
    ).toBe(true);
  });

  it("같은 페이지가 반복되면 멈춘다", () => {
    expect(
      myBookingsPagesStalled([
        { items: [item(1, "2026-09-01T00:00:00Z")] },
        { items: [item(1, "2026-09-01T00:00:00Z")] },
      ]),
    ).toBe(true);
    expect(
      myBookingsHasMore({
        hasNextPage: true,
        loadedCount: 1,
        totalCount: 12,
        stalled: true,
      }),
    ).toBe(false);
  });

  it("탭이 비었고 더 있으면 자동으로 다음을 가져온다", () => {
    expect(
      shouldPrefetchMyBookingsTab({
        tabItemCount: 0,
        hasMore: true,
        isFetchingNextPage: false,
        isFetchNextPageError: false,
      }),
    ).toBe(true);
    expect(
      shouldPrefetchMyBookingsTab({
        tabItemCount: 1,
        hasMore: true,
        isFetchingNextPage: false,
        isFetchNextPageError: false,
      }),
    ).toBe(false);
  });
});

describe("nextMyBookingsPageParam", () => {
  it("다음 페이지가 있으면 다음 인덱스를 준다", () => {
    const last = { items: [item(1, "2026-09-01T00:00:00Z")], hasNext: true };
    expect(nextMyBookingsPageParam(last, [last], { maxPages: 50 })).toBe(1);
  });

  it("총 건수가 더 많고 마지막 페이지가 비어 있지 않으면 한 번 더 시도한다", () => {
    const last = { items: [item(1, "2026-09-01T00:00:00Z")], hasNext: false };
    expect(
      nextMyBookingsPageParam(last, [last], { maxPages: 50, totalCount: 3 }),
    ).toBe(1);
  });

  it("중복만 오면 다음 페이지를 주지 않는다", () => {
    const first = { items: [item(1, "2026-09-01T00:00:00Z")], hasNext: true };
    const dup = { items: [item(1, "2026-09-01T00:00:00Z")], hasNext: true };
    expect(
      nextMyBookingsPageParam(dup, [first, dup], { maxPages: 50, totalCount: 9 }),
    ).toBeUndefined();
  });
});
