import { describe, expect, it } from "vitest";
import { adminTableAlignClass } from "./adminTableAlign";

describe("adminTableAlignClass", () => {
  it("텍스트는 왼쪽이다", () => {
    expect(adminTableAlignClass("text")).toBe("text-left");
  });

  it("수량·금액은 오른쪽이고 자릿수가 흔들리지 않는다", () => {
    expect(adminTableAlignClass("numeric")).toBe(
      "text-right tabular-nums whitespace-nowrap",
    );
  });

  it("날짜·상태·버튼은 가운데다", () => {
    expect(adminTableAlignClass("center")).toBe("text-center");
    expect(adminTableAlignClass("center", { nowrap: true })).toBe(
      "text-center whitespace-nowrap",
    );
  });
});
