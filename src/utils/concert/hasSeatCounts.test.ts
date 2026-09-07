import { describe, expect, it } from "vitest";
import { hasSeatCounts } from "./hasSeatCounts";

describe("hasSeatCounts", () => {
  it("두 값이 모두 number일 때만 true다", () => {
    expect(hasSeatCounts({ totalSeats: 500, remainingSeats: 245 })).toBe(true);
    expect(hasSeatCounts({ totalSeats: 500, remainingSeats: 0 })).toBe(true);
  });

  it("키 생략·null·한쪽만 있으면 false다", () => {
    expect(hasSeatCounts({})).toBe(false);
    expect(hasSeatCounts({ totalSeats: 500 })).toBe(false);
    expect(hasSeatCounts({ remainingSeats: 0 })).toBe(false);
    expect(hasSeatCounts({ totalSeats: null, remainingSeats: 10 })).toBe(false);
    expect(hasSeatCounts({ totalSeats: 100, remainingSeats: null })).toBe(
      false,
    );
  });
});
