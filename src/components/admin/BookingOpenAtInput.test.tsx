import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import BookingOpenAtInput from "./BookingOpenAtInput";
import DatePartsInput from "./DatePartsInput";
import { timeInputClass } from "@/utils/admin/timeInput";
import { formatBookingOpenAt, isValidBookingOpenAt } from "@/utils/admin/concertFormValidation";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
type Element = React.ReactElement<Record<string, unknown>>;
function nodes(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  if (node.type === DatePartsInput) return nodes(DatePartsInput(node.props as unknown as React.ComponentProps<typeof DatePartsInput>));
  return [node, ...nodes(node.props.children as React.ReactNode)];
}

it("disables all schedule controls without erasing the draft or its seconds", () => {
  const onChange = vi.fn();
  const value = "2028-02-29 20:30:45";
  const controls = nodes(BookingOpenAtInput({ value, onChange, disabled: true, "aria-describedby": "booking-schedule-note" }))
    .filter((node) => node.type === "input" || node.type === "select");
  expect(controls).toHaveLength(4);
  for (const node of controls) expect(node.props).toMatchObject({ disabled: true, "aria-describedby": "booking-schedule-note" });
  expect(controls.map((node) => node.props.value)).toEqual(["2028", "02", "29", "20:30:45"]);
  expect(onChange).not.toHaveBeenCalled();
});
// Controlled component: exercise the real input/select onChange adapters in Node.
function setup(initial = "") {
  let value = initial;
  const onChange = vi.fn((next: string) => { value = next; });
  const elements = () => nodes(BookingOpenAtInput({ value, onChange }));
  const input = (part: string) => elements().find((node) => node.props.id === `booking-open-${part}`)!;
  return {
    value: () => value, onChange, input,
    change: (part: string, next: string) => (input(part).props.onChange as (event: { target: { value: string } }) => void)({ target: { value: next } }),
    days: () => nodes(input("day")).filter((node) => node.type === "option" && node.props.value !== "").length,
  };
}

it.each(["0000", "0905", "1900", "2359", "2500", "1270"])("uses the shared text time pattern and existing validation (%s)", (digits) => {
  const ui = setup("2028-02-29T");
  expect(ui.input("time").props).toMatchObject({ type: "text", inputMode: "numeric", placeholder: "예: 19:00", className: timeInputClass });
  ui.change("time", digits);
  expect(ui.value()).toBe(`2028-02-29T${digits.slice(0, 2)}:${digits.slice(2)}`);
  expect(isValidBookingOpenAt(ui.value())).toBe(!["2500", "1270"].includes(digits));
  ui.change("time", "19:00");
  expect(isValidBookingOpenAt(ui.value())).toBe(true);
});

it("retains seconds mode while deleting and restoring the last digit", () => {
  const ui = setup("2027-08-01 20:00:37");
  expect(ui.input("time").props.value).toBe("20:00:37");
  ui.change("time", "20:00:3");
  expect(ui.input("time").props.value).toBe("20:00:3");
  expect(ui.input("time").props.maxLength).toBe(8);
  ui.change("time", "20:00:38");
  expect(ui.value()).toBe("2027-08-01 20:00:38");
  expect(formatBookingOpenAt(ui.value())).toBe("2027-08-01 20:00:38");
});

it("retains seconds mode through multiple deletions and minute-only edits", () => {
  const ui = setup("2027-08-01 20:00:37");
  for (const value of ["20:00:3", "20:00:", "20:00:4", "20:00:45"]) {
    ui.change("time", value);
    expect(ui.input("time").props.maxLength).toBe(8);
  }
  expect(ui.value()).toBe("2027-08-01 20:00:45");
  ui.change("time", "21:30");
  expect(ui.value()).toBe("2027-08-01 21:30:00");
});

it("resets to minute mode after clearing, including a fully empty optional value", () => {
  const ui = setup("2027-08-01 20:00:37");
  ui.change("time", "");
  expect(ui.input("time").props.maxLength).toBe(5);
  for (const part of ["day", "month", "year"]) ui.change(part, "");
  expect(ui.value()).toBe("");
  expect(formatBookingOpenAt(ui.value())).toBeUndefined();
  ui.change("time", "1900");
  expect(ui.input("time").props.value).toBe("19:00");
  expect(ui.input("time").props.maxLength).toBe(5);
  expect(setup().input("time").props.maxLength).toBe(5);
});

it("enables year, month and day sequentially and produces the existing local datetime", () => {
  const ui = setup();
  expect(ui.input("month").props.disabled).toBe(true);
  expect(ui.input("day").props.disabled).toBe(true);
  ui.change("year", "202");
  expect(ui.input("month").props.disabled).toBe(true);
  ui.change("year", "2028");
  expect(ui.input("month").props.disabled).toBe(false);
  expect(ui.input("day").props.disabled).toBe(true);
  ui.change("month", "02");
  expect(ui.input("day").props.disabled).toBe(false);
  expect(ui.days()).toBe(29);
  ui.change("day", "29");
  expect(() => formatBookingOpenAt(ui.value())).toThrow();
  ui.change("time", "20:30");
  expect(ui.value()).toBe("2028-02-29T20:30");
  expect(formatBookingOpenAt(ui.value())).toBe("2028-02-29 20:30:00");
});

it("keeps the entered KST 19:00 in the request formatter (#356)", () => {
  const ui = setup();
  for (const [part, value] of [["year", "2026"], ["month", "09"], ["day", "22"], ["time", "19:00"]]) ui.change(part, value);
  expect(ui.value()).toBe("2026-09-22T19:00");
  expect(formatBookingOpenAt(ui.value())).toBe("2026-09-22 19:00:00");
});

it.each(["2027-08-01 20:00:00", "2027-08-01 20:00:45"])("preserves restored space-separated values and seconds (%s)", (initial) => {
  const ui = setup(initial);
  expect(ui.input("year").props.value).toBe("2027");
  expect(ui.input("month").props.value).toBe("08");
  expect(ui.input("day").props.value).toBe("01");
  expect(ui.onChange).not.toHaveBeenCalled();
  ui.change("time", ui.input("time").props.value as string);
  expect(ui.value()).toBe(initial);
  expect(formatBookingOpenAt(ui.value())).toBe(initial);
  ui.change("day", "02");
  expect(formatBookingOpenAt(ui.value())).toBe(initial.replace("08-01", "08-02"));
});

it("serializes the #673 create UI contract", () => {
  const ui = setup();
  for (const [part, value] of [["year", "2027"], ["month", "08"], ["day", "01"], ["time", "20:00"]]) ui.change(part, value);
  expect(formatBookingOpenAt(ui.value())).toBe("2027-08-01 20:00:00");
});

it.each([["2027", "02", 28], ["2028", "02", 29], ["1900", "02", 28], ["2000", "02", 29], ["2100", "02", 28], ["2028", "04", 30], ["2028", "05", 31]])(
  "renders only existing days for %s-%s", (year, month, days) => expect(setup(`${year}-${month}-T`).days()).toBe(days),
);
it.each([["2028-03-31T20:30", "month", "04"], ["2028-02-29T20:30", "year", "2027"]])(
  "clears an invalidated day from %s", (initial, part, next) => {
    const ui = setup(initial);
    ui.change(part, next);
    expect(ui.input("day").props.value).toBe("");
    expect(isValidBookingOpenAt(ui.value())).toBe(false);
    expect(() => formatBookingOpenAt(ui.value())).toThrow();
  },
);
it.each(["2028-02-29T20:30:00", "2028-02-29T20:30:45"])("preserves unchanged edit data including seconds (%s)", (initial) => {
  const ui = setup(initial);
  expect(ui.input("year").props.value).toBe("2028");
  expect(ui.input("month").props.value).toBe("02");
  expect(ui.input("day").props.value).toBe("29");
  expect(ui.input("time").props.value).toBe(initial.endsWith(":00") ? "20:30" : "20:30:45");
  expect(ui.onChange).not.toHaveBeenCalled();
  ui.change("time", ui.input("time").props.value as string);
  expect(ui.value()).toBe(initial);
});
it("allows complete empty input but never silently drops partial input", () => {
  const ui = setup();
  expect(formatBookingOpenAt(ui.value())).toBeUndefined();
  ui.change("time", "20:30");
  expect(() => formatBookingOpenAt(ui.value())).toThrow();
  ui.change("time", "");
  expect(ui.value()).toBe("");
  ui.change("year", "2028");
  expect(() => formatBookingOpenAt(ui.value())).toThrow();
  ui.change("year", "");
  expect(ui.value()).toBe("");
});
it.each(["24:00", "20:60", "bad"])("blocks invalid time %s", (time) => {
  const ui = setup("2028-02-29T20:30");
  ui.change("time", time);
  expect(() => formatBookingOpenAt(ui.value())).toThrow();
});

it.each(["2027", "2028"])("preserves January 31 through an incomplete year then %s", (year) => {
  const ui = setup("2028-01-31T20:30:45");
  ui.change("year", "202");
  expect(ui.input("month").props.value).toBe("01");
  expect(ui.input("day").props.value).toBe("31");
  expect(ui.input("month").props.disabled).toBe(true);
  expect(ui.input("day").props.disabled).toBe(true);
  expect(() => formatBookingOpenAt(ui.value())).toThrow();
  ui.change("year", year);
  expect(ui.value()).toBe(`${year}-01-31T20:30:45`);
  expect(formatBookingOpenAt(ui.value())).toBe(`${year}-01-31 20:30:45`);
});

it("clears February 29 only after the new non-leap year is complete", () => {
  const ui = setup("2028-02-29T20:30");
  ui.change("year", "202");
  expect(ui.input("day").props.value).toBe("29");
  ui.change("year", "2027");
  expect(ui.value()).toBe("2027-02-T20:30");
  expect(ui.input("month").props.value).toBe("02");
  expect(ui.input("day").props.value).toBe("");
  expect(() => formatBookingOpenAt(ui.value())).toThrow();
});

it.each([["0999", true], ["1000", false], ["2028", false], ["9999", false]] as const)(
  "gates selects for year %s", (year, disabled) => {
    const ui = setup("2028-01-31T20:30");
    ui.change("year", year);
    expect(ui.input("month").props.disabled).toBe(disabled);
    expect(ui.input("day").props.disabled).toBe(disabled);
    expect(ui.input("day").props.value).toBe("31");
    if (disabled) expect(() => formatBookingOpenAt(ui.value())).toThrow();
    else expect(isValidBookingOpenAt(ui.value())).toBe(true);
  },
);

it.each(["10000", "abcd", "-2028", "20.28", " "])("rejects unsupported year input %s at the input handler", (year) => {
  const ui = setup();
  expect(ui.input("year").props.maxLength).toBe(4);
  ui.change("year", year);
  expect(ui.onChange).not.toHaveBeenCalled();
  expect(ui.input("month").props.disabled).toBe(true);
  expect(ui.input("day").props.disabled).toBe(true);
});
