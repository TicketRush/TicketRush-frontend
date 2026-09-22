import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminRefundListItem } from "@/types/domain/booking";
import AdminRefundsPage from "./AdminRefundsPage";

const item = (
  bookingNumber: string,
  refundStatus: AdminRefundListItem["refundStatus"],
  title: string,
): AdminRefundListItem => ({
  bookingId: 1,
  bookingNumber,
  userId: 1,
  performanceId: 1,
  bookingStatus: refundStatus === "FAILED" ? "CONFIRMED" : "REFUNDED",
  refundStatus,
  bookedAt: "2026-05-22T10:30:00Z",
  refundFailedAt: null,
  performanceTitle: title,
  performanceDate: "2026-07-20",
  performanceTime: "18:00:00",
  bookerName: "김철수",
  paymentAmount: 132000,
});

const refundState = vi.hoisted(() => ({
  stats: {
    totalRefunds: 12,
    inProgressRefunds: 3,
    completedRefunds: 8,
    failedRefunds: 1,
  } as
    | {
        totalRefunds: number;
        inProgressRefunds: number;
        completedRefunds: number;
        failedRefunds: number;
      }
    | undefined,
  items: [] as AdminRefundListItem[],
  hasNext: false,
  isLoading: false,
  isError: false,
}));

vi.mock("@/hooks/admin/useAdminRefunds", () => ({
  useAdminRefundStats: () => ({ data: refundState.stats, isError: false }),
  useAdminRefundList: () => ({
    data: { items: refundState.items, hasNext: refundState.hasNext },
    isLoading: refundState.isLoading,
    isError: refundState.isError,
    refetch: vi.fn(),
  }),
  useRetryRefund: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

describe("AdminRefundsPage (#397)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    refundState.stats = {
      totalRefunds: 12,
      inProgressRefunds: 3,
      completedRefunds: 8,
      failedRefunds: 1,
    };
    refundState.items = [
      item("R-FAIL", "FAILED", "실패 공연"),
      item("R-DONE", "COMPLETED", "완료 공연"),
    ];
    refundState.hasNext = false;
    refundState.isLoading = false;
    refundState.isError = false;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("통계 카드는 목록 길이가 아니라 전체 모집단을 보여 준다", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminRefundsPage />
      </MemoryRouter>,
    );
    expect(html).toContain("환불 내역을 조회하고 관리합니다");
    expect(html).not.toContain("진행·완료·실패 합");
    expect(html).not.toContain("정상 진행과 고착 포함");
    expect(html).not.toContain("환불이 끝난 예매");
    expect(html).not.toContain("실패 이력이 남은 확정 예매");
    expect(html).toContain(">12<");
    expect(html).toContain(">3<");
    expect(html).toContain(">8<");
    expect(html).toContain(">1<");
    expect(html).toContain("실패 공연");
    expect(html).toContain("김철수");
    expect(html).toContain("2026-07-20 18:00");
    expect(html).not.toContain("좌석");
    expect(html).not.toContain("현재 페이지");
  });

  it("미해결 실패만 재시도 버튼이 있고 완료 건에는 없다", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminRefundsPage />
      </MemoryRouter>,
    );
    expect(html).toMatch(/R-FAIL[\s\S]*재시도<\/button>[\s\S]*R-DONE/);
    expect(html.split("R-DONE")[1]).not.toContain("재시도</button>");
  });
});
