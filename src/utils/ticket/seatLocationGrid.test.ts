import { describe, expect, it } from "vitest";
import { buildSeatLocationGrid } from "./seatLocationGrid";

describe("buildSeatLocationGrid", () => {
  it("keeps the default 10 by 12 map when the seat is inside it", () => {
    expect(buildSeatLocationGrid("B-4")).toEqual({
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      colCount: 12,
      targetRow: "B",
      targetCol: 4,
    });
  });

  it("extends columns so a seat past column 12 can be marked", () => {
    const grid = buildSeatLocationGrid("E-20");

    expect(grid.colCount).toBe(20);
    expect(grid.targetRow).toBe("E");
    expect(grid.targetCol).toBe(20);
    expect(grid.rows).toContain("E");
  });

  it("extends single-letter rows past J", () => {
    const grid = buildSeatLocationGrid("L-3");

    expect(grid.rows.at(-1)).toBe("L");
    expect(grid.targetRow).toBe("L");
    expect(grid.colCount).toBe(12);
  });

  it("appends a multi-letter row that the default map does not have", () => {
    const grid = buildSeatLocationGrid("AA-12");

    expect(grid.rows.at(-1)).toBe("AA");
    expect(grid.targetCol).toBe(12);
  });

  it("trims the label before parsing", () => {
    expect(buildSeatLocationGrid(" E-20 ")).toMatchObject({
      targetRow: "E",
      targetCol: 20,
      colCount: 20,
    });
  });

  it("does not mark a seat when the label cannot be parsed", () => {
    expect(buildSeatLocationGrid("-")).toMatchObject({
      colCount: 12,
      targetRow: null,
      targetCol: null,
    });
  });
});
