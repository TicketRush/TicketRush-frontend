import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Pagination from "./Pagination";

function renderPagination(surface?: "light" | "dark") {
  return renderToStaticMarkup(
    <Pagination
      pageIndex={0}
      totalPages={2}
      onChange={vi.fn()}
      surface={surface}
    />,
  );
}

describe("Pagination contrast", () => {
  it("흰 카드에서는 현재가 아닌 페이지와 화살표를 진하게 그린다", () => {
    const html = renderPagination("light");

    expect(html).toContain("bg-primary text-white font-bold");
    expect(html).toContain("text-gray-900");
    expect(html).not.toContain("text-admin-text");
  });

  it("다크 카드에서는 밝은 글자를 유지한다", () => {
    const html = renderPagination("dark");

    expect(html).toContain("bg-primary text-white font-bold");
    expect(html).toContain("text-admin-text");
    expect(html).not.toContain("text-gray-900");
  });
});
