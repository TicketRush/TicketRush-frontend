import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminRefundsPage from "./AdminRefundsPage";

vi.mock("@/hooks/admin/useAdminRefunds", () => ({
  useRefundFailedBookings: () => ({
    data: { items: [], hasNext: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRefundingStuckBookings: () => ({
    data: { items: [], hasNext: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRetryRefund: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

describe("AdminRefundsPage (#338)", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("실패·고착 전용 화면임을 안내한다", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminRefundsPage />
      </MemoryRouter>,
    );
    expect(html).toContain("실패하거나 오래 멈춘 환불만 보여 줍니다");
    expect(html).toContain("정상 신청·진행 중 환불은");
    expect(html).toContain("환불 처리 실패");
    expect(html).toContain("환불 지연");
  });
});
