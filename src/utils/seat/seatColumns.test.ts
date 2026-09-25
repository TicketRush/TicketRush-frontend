import { describe, expect, it } from "vitest";
import { placeSeatsInColumns } from "./seatColumns";

describe("placeSeatsInColumns", () => {
  it("없는 열은 빈칸으로 남겨 위아래 열이 맞는다", () => {
    const seats = [
      { id: 1, col: 1 },
      { id: 3, col: 3 },
    ];
    expect(placeSeatsInColumns(seats, 3).map((seat) => seat?.id ?? null)).toEqual([
      1,
      null,
      3,
    ]);
  });
});
