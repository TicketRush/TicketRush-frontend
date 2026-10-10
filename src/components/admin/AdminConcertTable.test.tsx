import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdminConcertTable from "./AdminConcertTable";
import type { AdminConcertItem } from "@/types/domain/admin";

const concert: AdminConcertItem = {
  id: 1,
  title: "테스트 공연",
  genre: "CONCERT",
  date: "2027-01-01",
  showTime: "19:30:00",
  soldSeats: 10,
  totalSeats: 20,
  occupancyRate: 0.5,
  revenue: 123456,
  status: "ON_SALE",
};

function renderTable() {
  return renderToStaticMarkup(
    <AdminConcertTable
      data={[concert]}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

function headerClass(html: string, label: string) {
  const match = html.match(
    new RegExp(`<th class="([^"]+)">${label}</th>`),
  );
  return match?.[1] ?? "";
}

describe("AdminConcertTable variants (#373)", () => {
  it("모니터링은 관리 열이 없고 행은 클릭용 클래스다", () => {
    const html = renderToStaticMarkup(
      <AdminConcertTable
        data={[concert]}
        variant="monitoring"
        onRowClick={vi.fn()}
      />,
    );

    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">ID<\/th>/,
    );
    expect(html).toMatch(/<th class="py-3 px-3 text-left">공연명<\/th>/);
    expect(html).toContain("cursor-pointer");
    expect(html).toContain(
      "py-3 px-3 text-center font-bold tabular-nums whitespace-nowrap text-admin-text",
    );
    expect(html).not.toContain("수정");
    expect(html).not.toContain("bg-blue-100");
    expect(html).toContain("#00C950");
  });

  it("같은 점유율도 화면 기준에 따라 색이 다르다", () => {
    const full = { ...concert, occupancyRate: 0.9, status: "UPCOMING" as const };
    const dashboard = renderToStaticMarkup(
      <AdminConcertTable
        data={[full]}
        variant="dashboard"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const monitoring = renderToStaticMarkup(
      <AdminConcertTable
        data={[full]}
        variant="monitoring"
        onRowClick={vi.fn()}
      />,
    );

    expect(dashboard).toContain("text-green-600");
    expect(dashboard).toContain("bg-blue-100 text-blue-700");
    expect(dashboard).not.toContain("cursor-pointer");
    expect(monitoring).toContain("text-[#1D7DFF]");
    expect(monitoring).not.toContain("text-green-600");
    expect(monitoring).toContain("#6B7280");
    expect(monitoring).not.toContain("bg-blue-100");
  });

  it("취소는 매진보다 먼저 보이고 수정 버튼이 행 안에 있다", () => {
    const html = renderToStaticMarkup(
      <AdminConcertTable
        data={[{ ...concert, status: "CANCELED", soldOut: true }]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRowClick={vi.fn()}
      />,
    );

    expect(html).toContain("취소");
    expect(html).not.toContain("매진");
    expect(html).toContain("수정");
    expect(html).toContain("삭제");
  });
});

describe("AdminConcertTable alignment (#346)", () => {
  it("공연명만 왼쪽, 나머지 컬럼은 가운데 정렬한다", () => {
    const html = renderTable();

    expect(headerClass(html, "공연명")).toContain("text-left");
    expect(headerClass(html, "공연명")).not.toContain("text-center");

    for (const label of [
      "ID",
      "장르",
      "날짜",
      "판매/총",
      "점유율",
      "매출",
      "상태",
      "관리",
    ]) {
      expect(headerClass(html, label)).toContain("text-center");
      expect(headerClass(html, label)).not.toContain("text-left");
    }

    expect(html).toContain("flex justify-center gap-1");
    expect(html).toContain("tabular-nums");
  });
});
