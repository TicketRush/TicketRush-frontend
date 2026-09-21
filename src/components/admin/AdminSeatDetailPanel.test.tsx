import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdminSeatDetailPanel from "./AdminSeatDetailPanel";
import type { AdminSeatDetail } from "@/types/domain/admin";

const holdDetail: AdminSeatDetail = {
  seatId: 2,
  seatNumber: "A-2",
  status: "HOLD",
  bookingNumber: "BK-1",
  reservedBy: "홍길동",
  reservedAt: "2027-01-01T10:00:00Z",
  holdRemainingSec: 120,
};

function renderPanel(
  props: Partial<React.ComponentProps<typeof AdminSeatDetailPanel>> = {},
) {
  return renderToStaticMarkup(
    <AdminSeatDetailPanel
      detail={holdDetail}
      isLoading={false}
      onRelease={vi.fn()}
      onRefund={vi.fn()}
      onShowReserver={vi.fn()}
      {...props}
    />,
  );
}

describe("AdminSeatDetailPanel", () => {
  it("맵이 SOLD면 상세가 HOLD여도 예약 해제를 보여 주지 않는다", () => {
    vi.stubGlobal("React", React);
    const html = renderPanel({ mapStatus: "SOLD" });
    expect(html).toContain("판매 완료");
    expect(html).toContain("환불 처리");
    expect(html).not.toContain("예약 해제");
    vi.unstubAllGlobals();
  });

  it("맵이 SOLD인데 상세가 아직 HOLD면 예매자·작업을 막아 둔다", () => {
    vi.stubGlobal("React", React);
    const html = renderPanel({ mapStatus: "SOLD" });
    expect(html).toContain("갱신 중");
    expect(html).not.toContain("홍길동");
    expect(html).toMatch(/\sdisabled(?!:)/);
    vi.unstubAllGlobals();
  });

  it("맵과 상세가 모두 SOLD면 예매자를 보여 주고 작업을 연다", () => {
    vi.stubGlobal("React", React);
    const html = renderPanel({
      mapStatus: "SOLD",
      detail: { ...holdDetail, status: "SOLD", holdRemainingSec: undefined },
    });
    expect(html).toContain("홍길동");
    expect(html).not.toContain("갱신 중");
    expect(html).not.toMatch(/\sdisabled(?!:)/);
    vi.unstubAllGlobals();
  });

  it("맵과 상세가 HOLD면 예약 해제를 보여 준다", () => {
    vi.stubGlobal("React", React);
    const html = renderPanel({ mapStatus: "HOLD" });
    expect(html).toContain("예약 해제");
    expect(html).not.toContain("환불 처리");
    vi.unstubAllGlobals();
  });
});
