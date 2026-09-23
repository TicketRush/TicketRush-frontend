import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import AdminCalendar from "./AdminCalendar";
import { parseLocalDateKey } from "@/utils/admin/dashboardPeriod";

const harness = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.values)) {
      harness.values[index] =
        typeof initial === "function" ? (initial as () => unknown)() : initial;
    }
    return [
      harness.values[index],
      (next: unknown) => {
        harness.values[index] =
          typeof next === "function"
            ? (next as (prev: unknown) => unknown)(harness.values[index])
            : next;
      },
    ];
  },
}));

type Element = React.ReactElement<Record<string, unknown>>;

function all(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(all);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...all(node.props.children as React.ReactNode)];
}

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

function renderCalendar(
  onRangeChange: (range: { start: Date; end: Date }) => void,
) {
  harness.cursor = 0;
  return all(
    AdminCalendar({
      selectedRange: {
        start: parseLocalDateKey("2026-01-01"),
        end: parseLocalDateKey("2026-01-30"),
      },
      onRangeChange,
    }),
  );
}

function click(node: Element | undefined) {
  const onClick = node?.props.onClick;
  if (typeof onClick !== "function") {
    throw new Error("button is not clickable");
  }
  onClick();
}

function dayButton(nodes: Element[], day: number) {
  return nodes.find(
    (node) => node.type === "button" && node.props.children === day,
  );
}

beforeEach(() => {
  harness.values = [];
  harness.cursor = 0;
});

describe("AdminCalendar 92일 상한", () => {
  it("상한을 넘는 날짜는 클릭되지 않고, 유효한 끝점은 기간을 확정한다", () => {
    const onRangeChange = vi.fn();
    let nodes = renderCalendar(onRangeChange);

    click(dayButton(nodes, 1));
    expect(onRangeChange).not.toHaveBeenCalled();

    nodes = renderCalendar(onRangeChange);
    click(
      nodes.find(
        (node) =>
          node.type === "button" &&
          Array.isArray(node.props.children) &&
          textOf(node.props.children).startsWith("1월"),
      ),
    );

    nodes = renderCalendar(onRangeChange);
    click(
      nodes.find(
        (node) =>
          node.type === "button" && textOf(node.props.children) === "4월",
      ),
    );

    nodes = renderCalendar(onRangeChange);
    const withinLimit = dayButton(nodes, 2);
    const beyondLimit = dayButton(nodes, 3);

    expect(withinLimit?.props.disabled).toBeFalsy();
    expect(beyondLimit?.props.disabled).toBe(true);
    expect(beyondLimit?.props.onClick).toBeUndefined();
    expect(beyondLimit?.props.title).toBe(
      "최대 92일까지 선택할 수 있습니다",
    );
    expect(onRangeChange).not.toHaveBeenCalled();

    click(withinLimit);
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenCalledWith({
      start: parseLocalDateKey("2026-01-01"),
      end: parseLocalDateKey("2026-04-02"),
    });
  });
});
