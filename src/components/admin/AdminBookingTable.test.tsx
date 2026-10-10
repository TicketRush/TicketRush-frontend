import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdminBookingTable from "./AdminBookingTable";
import type { AdminBookingItem } from "@/types/domain/admin";

const booking: AdminBookingItem = {
  bookingId: 1,
  bookingNumber: "B-1",
  userId: 1,
  performanceId: 1,
  seatId: 1,
  concertTitle: "테스트 공연",
  concertDate: "2027-01-01",
  bookedAt: "2026-05-22T10:30:00Z",
  userName: "김철수",
  userEmail: "user@example.com",
  seatNumbers: ["A-1"],
  seatCount: 1,
  unitPrice: 10000,
  totalAmount: 10000,
  status: "CONFIRMED",
};

function headerClass(html: string, label: string) {
  const match = html.match(new RegExp(`<th class="([^"]+)">${label}</th>`));
  return match?.[1] ?? "";
}

function renderTable(expandedId: string | null = null) {
  return renderToStaticMarkup(
    <AdminBookingTable
      data={[booking]}
      onRefund={vi.fn()}
      expandedId={expandedId}
      onExpandedIdChange={vi.fn()}
    />,
  );
}

describe("AdminBookingTable alignment (#372)", () => {
  it("텍스트는 왼쪽, 금액은 오른쪽, 날짜·상태·상세는 가운데다", () => {
    const html = renderTable();

    expect(html).not.toContain("text-sm text-center");
    expect(headerClass(html, "예매번호")).toContain("text-left");
    expect(headerClass(html, "공연명")).toContain("text-left");
    expect(headerClass(html, "예매자")).toContain("text-left");
    expect(headerClass(html, "금액")).toContain("text-right");
    expect(headerClass(html, "금액")).toContain("tabular-nums");
    expect(headerClass(html, "공연날짜")).toContain("text-center");
    expect(headerClass(html, "예매일시")).toContain("text-center");
    expect(headerClass(html, "상태")).toContain("text-center");
    expect(headerClass(html, "상세")).toContain("text-center");
  });

  it("펼친 상세 행은 왼쪽이다", () => {
    const html = renderTable(booking.bookingNumber);
    expect(html).toContain("p-4 text-left");
    expect(html).toContain("예매자 정보");
  });
});
