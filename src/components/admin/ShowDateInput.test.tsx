import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ShowDateInput from "./ShowDateInput";
import DatePartsInput from "./DatePartsInput";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
type Element = React.ReactElement<Record<string, unknown>>;
function nodes(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  if (node.type === DatePartsInput) return nodes(DatePartsInput(node.props as unknown as React.ComponentProps<typeof DatePartsInput>));
  return [node, ...nodes(node.props.children as React.ReactNode)];
}
// Exercise actual input/select handlers with controlled rerenders in Node.
function setup(initial = "") {
  let value = initial;
  const onChange = vi.fn((next: string) => { value = next; });
  const input = (part: string) => nodes(ShowDateInput({ value, onChange })).find((node) => node.props.id === `show-date-${part}`)!;
  return {
    value: () => value, input, onChange,
    change: (part: string, next: string) => (input(part).props.onChange as (event: { target: { value: string } }) => void)({ target: { value: next } }),
    days: () => nodes(input("day")).filter((node) => node.type === "option" && node.props.value !== "").length,
  };
}

it("connects sequential date selections to the show date string", () => {
  const ui = setup();
  expect(ui.input("year").props.disabled).toBeUndefined();
  expect(ui.input("month").props.disabled).toBe(true);
  expect(ui.input("day").props.disabled).toBe(true);
  ui.change("year", "2028");
  expect(ui.value()).toBe("2028--");
  expect(ui.input("month").props.disabled).toBe(false);
  expect(ui.input("day").props.disabled).toBe(true);
  ui.change("month", "02");
  expect(ui.input("day").props.disabled).toBe(false);
  expect(ui.days()).toBe(29);
  ui.change("day", "29");
  expect(ui.value()).toBe("2028-02-29");
});
it.each([["2027", "02", 28], ["2028", "02", 29], ["1900", "02", 28], ["2000", "02", 29], ["2100", "02", 28], ["2028", "04", 30], ["2028", "05", 31]])(
  "uses shared Gregorian day options for %s-%s", (year, month, count) => expect(setup(`${year}-${month}-`).days()).toBe(count),
);
it.each([["2028-01-31", "2027", "2027-01-31"], ["2028-01-31", "2028", "2028-01-31"], ["2028-02-29", "2027", "2027-02-"]])(
  "preserves candidates while editing %s then validates %s", (initial, year, expected) => {
    const ui = setup(initial);
    ui.change("year", "202");
    expect(ui.input("day").props.value).toBe(initial.slice(8));
    expect(ui.input("month").props.disabled).toBe(true);
    expect(ui.input("day").props.disabled).toBe(true);
    ui.change("year", year);
    expect(ui.value()).toBe(expected);
  },
);
it("invalidates March 31 when selecting April", () => {
  const ui = setup("2028-03-31");
  ui.change("month", "04");
  expect(ui.value()).toBe("2028-04-");
});
it.each([["0999", true], ["1000", false], ["9999", false]] as const)("uses the existing year bounds for %s", (year, disabled) => {
  const ui = setup();
  ui.change("year", year);
  expect(ui.input("month").props.disabled).toBe(disabled);
});
it("rejects five-digit years at the real input handler", () => {
  const ui = setup();
  ui.change("year", "10000");
  expect(ui.onChange).not.toHaveBeenCalled();
  expect(ui.input("year").props.maxLength).toBe(4);
});
it("restores edit values without emitting a change", () => {
  const ui = setup("2028-02-29");
  expect(ui.input("year").props.value).toBe("2028");
  expect(ui.input("month").props.value).toBe("02");
  expect(ui.input("day").props.value).toBe("29");
  expect(ui.onChange).not.toHaveBeenCalled();
});
