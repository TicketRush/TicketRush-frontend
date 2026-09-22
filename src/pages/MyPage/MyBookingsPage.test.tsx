import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingListItem } from "@/types/domain/booking";
import MyBookingsPage from "./MyBookingsPage";

const item = (
  bookingId: number,
  status: BookingListItem["status"],
  title: string,
  date: string,
): BookingListItem => ({
  bookingId,
  bookingNumber: `N-${bookingId}`,
  status,
  performanceTitle: title,
  performanceVenue: "서울",
  performanceDate: date,
  seatNumber: "A-1",
  createdAt: "2026-09-01T00:00:00Z",
});

const bookingsState = vi.hoisted(() => ({
  items: [] as BookingListItem[],
  totalCount: undefined as number | undefined,
  isCountError: false,
  isLoading: false,
  isError: false,
  hasMore: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  fetchNextPage: vi.fn(),
}));

vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));
vi.mock("@/stores/global/authStore", () => ({
  default: (
    selector: (state: {
      user: {
        userId: number;
        name: string;
        email: string;
        role: "MEMBER";
        joinedAt: string;
      };
    }) => unknown,
  ) =>
    selector({
      user: {
        userId: 1,
        name: "테스터",
        email: "test@example.com",
        role: "MEMBER",
        joinedAt: "2026-01-01T00:00:00Z",
      },
    }),
}));
vi.mock("@/hooks/queries/useMyBookings", () => ({
  useMyBookings: () => bookingsState,
}));
vi.mock("@/components/mypage/BookingCard", () => ({
  BookingCard: ({ booking }: { booking: BookingListItem }) => (
    <article>{booking.performanceTitle}</article>
  ),
}));

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <MyBookingsPage />
    </MemoryRouter>,
  );
}

describe("MyBookingsPage (#339/#380)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    bookingsState.items = [
      item(1, "CONFIRMED", "확정 예정 공연", "2099-01-01"),
      item(5, "REFUNDING", "환불 신청 공연", "2099-01-04"),
      item(6, "REFUNDED", "환불 완료 예정 공연", "2099-01-05"),
    ];
    bookingsState.totalCount = 12;
    bookingsState.isCountError = false;
    bookingsState.isLoading = false;
    bookingsState.isError = false;
    bookingsState.hasMore = false;
    bookingsState.isFetchingNextPage = false;
    bookingsState.isFetchNextPageError = false;
    bookingsState.fetchNextPage.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("훅이 걸러 준 확정·환불 건만 그리고 총 예매 수는 count API를 쓴다", () => {
    const html = renderPage();
    expect(html).toContain("확정 예정 공연");
    expect(html).toContain("환불 신청 공연");
    expect(html).toContain("환불 완료 예정 공연");
    expect(html).toContain("총 예매 수");
    expect(html).toContain(">12<");
  });

  it("count가 오기 전에는 총 예매 수를 목록 길이로 채우지 않는다", () => {
    bookingsState.totalCount = undefined;
    const html = renderPage();
    expect(html).toContain("—");
    expect(html).not.toContain(">3<");
  });

  it("count 실패 시에만 목록 길이를 총 예매 수로 쓴다", () => {
    bookingsState.totalCount = undefined;
    bookingsState.isCountError = true;
    const html = renderPage();
    expect(html).toContain(">3<");
  });

  it("더 있으면 더보기를 보여 준다", () => {
    bookingsState.hasMore = true;
    const html = renderPage();
    expect(html).toContain("더보기");
  });

  it("탭이 비었는데 더 있으면 없다는 말 대신 이어서 불러온다", () => {
    bookingsState.items = [];
    bookingsState.hasMore = true;
    bookingsState.isFetchingNextPage = true;
    const html = renderPage();
    expect(html).toContain("예매 내역을 더 불러오는 중...");
    expect(html).not.toContain("예정된 예매 내역이 없습니다.");
  });
});
