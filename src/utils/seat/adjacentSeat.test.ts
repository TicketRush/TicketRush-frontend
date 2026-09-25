import { describe, expect, it } from "vitest";
import { findAdjacentSeat, resolveSeatArrowKey } from "./adjacentSeat";

const seats = [
  { id: 1, row: "A", col: 1, status: "AVAILABLE" },
  { id: 2, row: "A", col: 2, status: "SOLD" },
  { id: 3, row: "A", col: 3, status: "AVAILABLE" },
  { id: 4, row: "B", col: 1, status: "HOLD" },
  { id: 5, row: "B", col: 2, status: "AVAILABLE" },
  { id: 6, row: "B", col: 3, status: "AVAILABLE" },
  { id: 7, row: "C", col: 3, status: "AVAILABLE" },
];

describe("resolveSeatArrowKey", () => {
  it("방향키만 좌석 이동으로 본다", () => {
    expect(resolveSeatArrowKey({ key: "ArrowRight" })).toBe("right");
    expect(resolveSeatArrowKey({ key: "Enter" })).toBeNull();
    expect(resolveSeatArrowKey({ key: "+" })).toBeNull();
    expect(resolveSeatArrowKey({ key: "ArrowLeft", altKey: true })).toBeNull();
  });
});

describe("findAdjacentSeat", () => {
  it("같은 행에서 예매 가능한 다음 좌석으로 간다", () => {
    expect(findAdjacentSeat(seats, 1, "right")?.id).toBe(3);
    expect(findAdjacentSeat(seats, 3, "left")?.id).toBe(1);
  });

  it("같은 열의 다음 행으로 가고, 막힌 열은 건너뛴다", () => {
    expect(findAdjacentSeat(seats, 3, "down")?.id).toBe(6);
    expect(findAdjacentSeat(seats, 6, "down")?.id).toBe(7);
    expect(findAdjacentSeat(seats, 7, "up")?.id).toBe(6);
  });

  it("같은 열이 없으면 옆으로 건너뛰지 않는다", () => {
    expect(findAdjacentSeat(seats, 1, "down")).toBeNull();
    expect(findAdjacentSeat(seats, 5, "up")).toBeNull();
  });

  it("가장자리에서는 더 이동하지 않는다", () => {
    expect(findAdjacentSeat(seats, 1, "left")).toBeNull();
    expect(findAdjacentSeat(seats, 7, "down")).toBeNull();
  });
});
