import { expect, it } from "vitest";
import { changeDatePart, getDaysInMonth, isValidYear } from "./dateParts";

it.each([[2027, 2, 28], [2028, 2, 29], [1900, 2, 28], [2000, 2, 29], [2100, 2, 28], [2028, 4, 30], [2028, 5, 31], [2028, 6, 30], [2028, 9, 30], [2028, 11, 30]])(
  "counts Gregorian days in %i-%i", (year, month, days) => expect(getDaysInMonth(year, month)).toBe(days),
);
it.each(["", "0", "99", "202", "0000", "0099", "0999", "abcd", "-2028", "20.28", " ", "10000"])("rejects incomplete/invalid year %s", (year) => expect(isValidYear(year)).toBe(false));
it.each(["1000", "1900", "2000", "2028", "9999"])("accepts supported year %s", (year) => expect(isValidYear(year)).toBe(true));
it.each(["", "202", "0999"])("preserves month/day candidates during year edit %s", (year) => {
  expect(changeDatePart({ year: "2028", month: "01", day: "31" }, "year", year)).toEqual({ year, month: "01", day: "31" });
});
it("clears invalid days but preserves valid days", () => {
  expect(changeDatePart({ year: "2028", month: "03", day: "31" }, "month", "04").day).toBe("");
  expect(changeDatePart({ year: "2028", month: "02", day: "29" }, "year", "2027").day).toBe("");
  expect(changeDatePart({ year: "2028", month: "03", day: "28" }, "month", "04").day).toBe("28");
});
