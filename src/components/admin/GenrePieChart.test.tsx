import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GenrePieChart from "./GenrePieChart";
import type { GenreRevenue } from "@/types/domain/admin";

const data: GenreRevenue[] = [
  { genre: "MUSICAL", label: "뮤지컬", revenue: 1_200_000, percentage: 45 },
  { genre: "CONCERT", label: "콘서트", revenue: 9_000, percentage: 8 },
];

describe("GenrePieChart legend alignment (#346)", () => {
  it("%와 금액을 같은 열에 두고 자릿수는 오른쪽에 맞춘다", () => {
    const html = renderToStaticMarkup(<GenrePieChart data={data} />);

    expect(html).toContain("grid-cols-subgrid");
    expect(html).toContain("justify-self-end");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("max-w-md");
    expect(html).toContain("45%");
    expect(html).toContain("₩1,200,000");
    expect(html).toContain("8%");
    expect(html).toContain("₩9,000");
    expect(html).not.toContain("min-w-[70px]");
    expect(html).not.toContain("justify-self-start");
  });
});
