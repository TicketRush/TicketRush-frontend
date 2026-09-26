import { describe, expect, it } from "vitest";
import {
  buildSeatLocationGrid,
  resolveSeatLocationMap,
} from "./seatLocationGrid";

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

describe("resolveSeatLocationMap", () => {
  const seats = [
    { row: "A", col: 1, seatNumber: "A-1" },
    { row: "A", col: 3, seatNumber: "A-3" },
    { row: "E", col: 20, seatNumber: "E-20" },
  ];

  it("keeps gaps and the layout width so the seat is not pushed to the edge", () => {
    const map = resolveSeatLocationMap("E-20", { seats, maxCols: 24 });
    const rowA = map.rows.find((row) => row.row === "A");
    const rowE = map.rows.find((row) => row.row === "E");

    expect(map.source).toBe("venue");
    expect(rowA?.cells.map((cell) => cell.kind)).toEqual([
      "seat",
      "gap",
      "seat",
      ...Array(21).fill("gap"),
    ]);
    expect(rowE?.cells[19]?.kind).toBe("mine");
    expect(rowE?.cells).toHaveLength(24);
  });

  it("keeps empty rows from the layout so the seat stays the same distance from the stage", () => {
    const map = resolveSeatLocationMap("E-20", {
      seats: [{ row: "E", col: 20, seatNumber: "E-20" }],
      maxCols: 20,
      totalRows: 6,
    });

    expect(map.rows.map((row) => row.row)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(map.rows[0]?.cells.every((cell) => cell.kind === "gap")).toBe(true);
    expect(map.rows[4]?.cells[19]?.kind).toBe("mine");
  });

  it("matches the booked seat by row and column when the label text differs", () => {
    const map = resolveSeatLocationMap("E-20", {
      seats: [{ row: "E", col: 20, seatNumber: "E20" }],
    });

    expect(map.source).toBe("venue");
    expect(map.rows.find((row) => row.row === "E")?.cells[19]?.kind).toBe(
      "mine",
    );
  });

  it("uses the schematic map when the booked seat is not in the layout", () => {
    expect(resolveSeatLocationMap("B-4", { seats }).source).toBe("schematic");
    expect(resolveSeatLocationMap("E-20", null).source).toBe("schematic");
  });
});
