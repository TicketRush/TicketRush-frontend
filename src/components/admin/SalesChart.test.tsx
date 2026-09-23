import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SalesChart from "./SalesChart";
import type { ConcertSalesStatus } from "@/types/domain/admin";

const data: ConcertSalesStatus[] = [
  {
    concertId: 1,
    title: "짧은 매출",
    genre: "CONCERT",
    date: "2026-09-01",
    soldSeats: 3,
    totalSeats: 120,
    occupancyRate: 0.025,
    revenue: 9_000,
  },
  {
    concertId: 2,
    title: "긴 매출 공연",
    genre: "MUSICAL",
    date: "2026-09-02",
    soldSeats: 120,
    totalSeats: 120,
    occupancyRate: 1,
    revenue: 12_000_000,
    isSoldOut: true,
  },
];

describe("SalesChart column alignment (#375)", () => {
  it("판매 수·매출을 공유 열로 맞추고 매진 뱃지는 매출 아래에 둔다", () => {
    const html = renderToStaticMarkup(<SalesChart data={data} />);

    expect(html).toContain("grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(html).toContain("grid-cols-subgrid");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("items-end");
    expect(html).toContain("3/120");
    expect(html).toContain("3%");
    expect(html).toContain("₩9,000");
    expect(html).toContain("120/120");
    expect(html).toContain("₩12,000,000");
    expect(html).toContain("매진");
    expect(html).not.toContain("min-w-[100px]");
    expect(html).not.toContain("min-w-[110px]");

    const soldOutIndex = html.indexOf("₩12,000,000");
    const badgeIndex = html.indexOf("매진");
    expect(soldOutIndex).toBeGreaterThan(-1);
    expect(badgeIndex).toBeGreaterThan(soldOutIndex);
  });
});
