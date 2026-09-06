import { describe, expect, it } from "vitest";
import { getDetailGaugeSeats } from "./getDetailGaugeSeats";
import type { ConcertSummary, SeatCounts } from "@/types/domain/concert";

const listItem: ConcertSummary = {
  id: 1,
  title: "t",
  performer: "p",
  genre: "CONCERT",
  address: "a",
  showDate: "2026-09-01",
  showTime: "19:00",
  price: 10000,
  imageMainUrl: "",
  status: "ON_SALE",
  totalSeats: 500,
  remainingSeats: 245,
};

const seatCounts: SeatCounts = {
  totalCount: 480,
  availableCount: 10,
  soldCount: 400,
  holdCount: 70,
};

describe("getDetailGaugeSeats", () => {
  it("목록 캐시가 있으면 목록 값을 쓴다", () => {
    expect(getDetailGaugeSeats(listItem, seatCounts, true)).toEqual({
      remaining: 245,
      total: 500,
    });
  });

  it("캐시가 없으면 seat-counts의 totalCount - soldCount를 쓴다", () => {
    expect(getDetailGaugeSeats(undefined, seatCounts, true)).toEqual({
      remaining: 80,
      total: 480,
    });
  });

  it("캐시도 seat-counts도 없으면 모름이다", () => {
    expect(getDetailGaugeSeats(undefined, undefined, false)).toEqual({
      remaining: null,
      total: 0,
    });
    expect(getDetailGaugeSeats(undefined, seatCounts, false)).toEqual({
      remaining: null,
      total: 0,
    });
  });

  it("totalCount가 0이면 채움 계산을 하지 않는다", () => {
    expect(
      getDetailGaugeSeats(
        undefined,
        { ...seatCounts, totalCount: 0, soldCount: 0 },
        true,
      ),
    ).toEqual({ remaining: null, total: 0 });
  });
});
