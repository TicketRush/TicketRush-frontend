import { describe, expect, it } from "vitest";
import { formatBookingOpenAt } from "./formatBookingOpenAt";
import { parseBookingOpenAt, bookingOpenAtForInput } from "./parseBookingOpenAt";

describe("formatBookingOpenAt", () => {
  it.each(["2026-09-22 19:00:00", "2026-09-22T19:00:00", "2026-09-22T19:00:00+09:00", "2026-09-22T10:00:00Z"])("supports legacy and explicit offsets: %s", (value) => {
    expect(parseBookingOpenAt(value)).toBe(Date.UTC(2026, 8, 22, 10));
    expect(formatBookingOpenAt(value)).toBe("2026년 09월 22일(화) 19:00");
  });
  it("rolls UTC dates forward in Seoul", () => {
    expect(formatBookingOpenAt("2026-09-22T19:00:00Z")).toBe("2026년 09월 23일(수) 04:00");
  });
  it.each(["", "bad", "2026-02-29 19:00:00", "2026-04-31T19:00:00Z", "2026-13-01 19:00:00", "2026-09-22 24:00:00", "2026-09-22 19:60:00", "2026-09-22 19:00:60", "2026-09-22 19:00:00junk", "2026-09-22T19:00:00+25:00"])("hides invalid input %s", (value) => {
    expect(parseBookingOpenAt(value)).toBeNull();
    expect(formatBookingOpenAt(value)).toBe("");
  });
  it("UTC ISO를 Asia/Seoul 벽시계로 포맷한다", () => {
    // 2026-09-15 03:00 UTC = 서울 12:00
    expect(formatBookingOpenAt("2026-09-15T03:00:00.000Z")).toBe(
      "2026년 09월 15일(화) 12:00",
    );
  });

  it("+09:00 offset을 Seoul 시각 그대로 유지한다", () => {
    expect(formatBookingOpenAt("2026-09-15T12:00:00+09:00")).toBe(
      "2026년 09월 15일(화) 12:00",
    );
  });

  it("legacy KST 벽시계를 그대로 표시한다", () => {
    expect(formatBookingOpenAt("2026-09-15 12:00:00")).toBe(
      "2026년 09월 15일(화) 12:00",
    );
  });

  it("잘못된 값은 빈 문자열을 반환한다", () => {
    expect(formatBookingOpenAt("not-a-date")).toBe("");
  });
});

it.each(["2027-08-01 20:00:00", "2027-08-01T20:00:00+09:00"])("restores #673 wall time without date conversion: %s", (value) => {
  expect(bookingOpenAtForInput(value)).toBe("2027-08-01 20:00:00");
  expect(formatBookingOpenAt(value)).toBe("2027년 08월 01일(일) 20:00");
});
