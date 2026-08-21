import { describe, expect, it } from "vitest";
import { canBookConcert, shouldFetchSeatCounts } from "./canBookConcert";

describe("canBookConcert", () => {
  it("ON_SALE + seatsReady + remaining > 0 일 때만 true", () => {
    expect(
      canBookConcert({
        status: "ON_SALE",
        seatsReady: true,
        remaining: 5,
      }),
    ).toBe(true);
  });

  it("매진·미확정·비 ON_SALE 은 false", () => {
    expect(
      canBookConcert({
        status: "ON_SALE",
        seatsReady: true,
        remaining: 0,
      }),
    ).toBe(false);

    expect(
      canBookConcert({
        status: "ON_SALE",
        seatsReady: true,
        remaining: null,
      }),
    ).toBe(false);

    expect(
      canBookConcert({
        status: "ON_SALE",
        seatsReady: false,
        remaining: 5,
      }),
    ).toBe(false);

    expect(
      canBookConcert({
        status: "CLOSED",
        seatsReady: true,
        remaining: 5,
      }),
    ).toBe(false);

    expect(
      canBookConcert({
        status: "UPCOMING",
        seatsReady: false,
        remaining: null,
      }),
    ).toBe(false);
  });
});

describe("shouldFetchSeatCounts", () => {
  it("ON_SALE만 true", () => {
    expect(shouldFetchSeatCounts("ON_SALE")).toBe(true);
    expect(shouldFetchSeatCounts("UPCOMING")).toBe(false);
    expect(shouldFetchSeatCounts("CLOSED")).toBe(false);
    expect(shouldFetchSeatCounts("CANCELED")).toBe(false);
  });
});
