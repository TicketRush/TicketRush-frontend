import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DatePartsInput from "./DatePartsInput";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

function controls(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(controls);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  if (node.type === "input" || node.type === "select") return [node];
  return controls(node.props.children as React.ReactNode);
}

it("forwards optional navigation props to all three date controls", () => {
  const onKeyDown = vi.fn();
  const inputs = controls(DatePartsInput({ id: "date", value: { year: "", month: "", day: "" }, onChange: vi.fn(), onKeyDown, "data-form-focus": "true" }));
  expect(inputs).toHaveLength(3);
  for (const input of inputs) {
    expect(input.props.onKeyDown).toBe(onKeyDown);
    expect(input.props["data-form-focus"]).toBe("true");
  }
  expect(inputs.map((input) => input.props.disabled)).toEqual([undefined, true, true]);
});

it("keeps navigation opt-in for existing consumers", () => {
  const inputs = controls(DatePartsInput({ id: "date", value: { year: "2028", month: "02", day: "29" }, onChange: vi.fn() }));
  expect(inputs).toHaveLength(3);
  for (const input of inputs) {
    expect(input.props.onKeyDown).toBeUndefined();
    expect(input.props["data-form-focus"]).toBeUndefined();
  }
});
