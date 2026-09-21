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
