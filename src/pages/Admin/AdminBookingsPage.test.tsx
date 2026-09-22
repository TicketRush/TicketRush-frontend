import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminBookingItem } from "@/types/domain/admin";
import AdminBookingsPage from "./AdminBookingsPage";

function booking(
  bookingNumber: string,
  status: AdminBookingItem["status"],
  concertTitle: string,
  bookingId = 1,
): AdminBookingItem {
  return {
    bookingId,
    bookingNumber,
    userId: 1,
    performanceId: 1,
    seatId: 1,
    concertTitle,
    concertDate: "2026-10-01",
    bookedAt: "2026-09-01 12:00:00",
    userName: "홍길동",
    userEmail: "a@b.c",
    seatNumbers: ["A-1"],
    seatCount: 1,
    unitPrice: 10000,
    totalAmount: 10000,
    status,
  };
}

const bookingsState = vi.hoisted(() => ({
  items: [] as AdminBookingItem[],
  totalElements: 0,
}));

vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));
vi.mock("@/hooks/admin/useAdmin", () => ({
  useAdminBookings: (params: { tab?: string; size?: number }) => {
    const refundedKpi = params.tab === "REFUNDED" && params.size === 1;
    return {
      data: {
        items: refundedKpi ? [] : bookingsState.items,
        pagination: {
          pageIndex: 0,
          size: params.size ?? 10,
          totalElements: refundedKpi ? 7 : bookingsState.totalElements,
          totalPages: 1,
          hasNext: false,
        },
      },
      isLoading: false,
      isError: false,
      isPlaceholderData: false,
    };
  },
  useAdminBookingStats: () => ({
    data: {
      totalBookings: 3,
      completedBookings: 0,
      canceledBookings: 2,
      totalRevenue: 0,
      revenueComplete: true,
      missingAmountBookings: 0,
    },
    isLoading: false,
    isError: false,
  }),
  useAdminBookingByNumber: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useAdminRefundBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("AdminBookingsPage (#337/#339)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    bookingsState.items = [
      booking("REFUNDED-1", "REFUNDED", "환불 완료 공연", 2),
    ];
    bookingsState.totalElements = 12;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("목록 건수와 환불 완료 KPI를 보여 주고 안내 문구는 빼 둔다", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminBookingsPage />
      </MemoryRouter>,
    );
    expect(html).toContain("환불 완료");
    expect(html).toContain("환불 완료 공연");
    expect(html).toContain(">12개의 예매<");
    expect(html).toContain(">7</p>");
    expect(html).not.toContain("미결제 취소");
    expect(html).not.toContain("모든 상태");
    expect(html).not.toContain("결제 완료만");
    expect(html).not.toContain("결제 완료 금액 합");
    expect(html).not.toContain("환불 완료만");
    expect(html).not.toContain("환불 완료 탭은");
    expect(html).not.toContain("다른 페이지를 확인해 주세요");
  });
});
