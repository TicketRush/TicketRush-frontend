import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingListItem } from "@/types/domain/booking";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { ApiError } from "@/api/errors/errorMapper";
import {
  applyUserRefundDeleteError,
  clearRefundDeadlinePassed,
  clearRefundPerformanceLookup,
  rememberRefundDeadlinePassed,
} from "@/utils/booking/userRefund";
import { BookingCard } from "./BookingCard";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  cancel: { mutateAsync: vi.fn(), isPending: false },
  refund: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/hooks/mutations/useCancelBooking", () => ({
  useCancelBooking: () => mocks.cancel,
}));
vi.mock("@/hooks/mutations/useRequestRefund", () => ({
  useRequestRefund: () => mocks.refund,
}));

const refundable: BookingListItem = {
  bookingId: 1,
  bookingNumber: "RFND1-TEST1",
  status: "CONFIRMED",
  performanceTitle: "테스트 공연",
  performanceVenue: "서울",
  performanceDate: "2027-03-15",
  performanceTime: "18:00",
  seatNumber: "A-1",
  price: 10000,
  createdAt: "2026-09-01T00:00:00Z",
};

function render(booking: BookingListItem, tab: "upcoming" | "past" = "upcoming") {
  return renderToStaticMarkup(<BookingCard booking={booking} tab={tab} />);
}

describe("BookingCard refund request (#338)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.refund.mutateAsync.mockReset();
    mocks.refund.isPending = false;
  });
  afterEach(() => {
    clearRefundDeadlinePassed();
    clearRefundPerformanceLookup();
    vi.unstubAllGlobals();
  });

  it("환불 가능 예매에 환불 신청 버튼을 보여 준다", () => {
    const html = render(refundable);
    expect(html).toContain("환불 신청");
    expect(html).toContain("예매 확정");
  });

  it("REFUNDING이면 새로고침 없이 환불 신청 완료로 표시한다", () => {
    const html = render({ ...refundable, status: "REFUNDING" });
    expect(html).toContain("환불 신청 완료");
    expect(html).not.toContain("환불 중");
  });

  it("서버가 마감으로 거절한 예매는 환불 버튼을 끈다", () => {
    rememberRefundDeadlinePassed(refundable.bookingNumber);
    const html = render(refundable);
    expect(html).toContain("환불 불가 (D-7 미만)");
    expect(html).not.toContain("환불 신청");
  });

  it("공연 정보 503 첫 실패는 환불 버튼을 유지한다", () => {
    applyUserRefundDeleteError(
      refundable.bookingNumber,
      new ApiError(
        {
          isSuccess: false,
          code: ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED,
          message: "서버 문구",
          result: null,
        },
        503,
      ),
    );
    const html = render(refundable);
    expect(html).toContain("환불 신청");
  });

  it("같은 예매의 두 번째 공연 정보 실패는 환불 버튼을 끈다", () => {
    const code = ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED;
    const failure = () =>
      new ApiError(
        { isSuccess: false, code, message: "서버 문구", result: null },
        503,
      );
    applyUserRefundDeleteError(refundable.bookingNumber, failure());
    applyUserRefundDeleteError(refundable.bookingNumber, failure());
    const html = render(refundable);
    expect(html).toContain("환불 불가");
    expect(html).not.toContain("환불 신청");
    expect(html).not.toContain("D-7");
  });

  it("지난 공연 탭에서는 환불 신청을 보여 주지 않는다", () => {
    const html = render(refundable, "past");
    expect(html).toContain("티켓 보기");
    expect(html).not.toContain("환불 신청");
  });
});
