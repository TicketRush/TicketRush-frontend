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
  today?: Date,
) {
  harness.cursor = 0;
  return all(
    AdminCalendar({
      selectedRange: {
        start: parseLocalDateKey("2026-01-01"),
        end: parseLocalDateKey("2026-01-30"),
      },
      onRangeChange,
      today: today ?? parseLocalDateKey("2026-09-25"),
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

function buttonByText(nodes: Element[], text: string) {
  return nodes.find(
    (node) => node.type === "button" && textOf(node.props.children) === text,
  );
}

function pressEscape(node: Element | undefined) {
  const onKeyDown = node?.props.onKeyDown;
  if (typeof onKeyDown !== "function") {
    throw new Error("element does not handle keys");
  }
  const event = { key: "Escape", stopPropagation: vi.fn() };
  onKeyDown(event);
  return event.stopPropagation;
}

beforeEach(() => {
  harness.values = [];
  harness.cursor = 0;
});

describe("AdminCalendar 오늘 이후", () => {
  const today = parseLocalDateKey("2026-01-15");

  it("시작일을 고르기 전에도 내일은 비활성이고, 92일 문구를 쓰지 않는다", () => {
    const onRangeChange = vi.fn();
    const nodes = renderCalendar(onRangeChange, today);
    const tomorrow = dayButton(nodes, 16);
    const todayButton = dayButton(nodes, 15);

    expect(todayButton?.props.disabled).toBeFalsy();
    expect(todayButton?.props.title).toBeUndefined();
    expect(tomorrow?.props.disabled).toBe(true);
    expect(tomorrow?.props.onClick).toBeUndefined();
    expect(tomorrow?.props.title).toBe("오늘 이후 날짜는 선택할 수 없습니다");
    expect(tomorrow?.props["aria-label"]).toBe(
      "2026년 1월 16일 금요일, 선택 불가, 오늘 이후 날짜는 선택할 수 없습니다",
    );
    expect(
      nodes.some(
        (node) =>
          node.type === "span" &&
          node.props.title === "오늘 이후 날짜는 선택할 수 없습니다",
      ),
    ).toBe(true);
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("미래이면서 92일을 넘는 날짜도 미래 안내만 보여 준다", () => {
    const onRangeChange = vi.fn();
    let nodes = renderCalendar(onRangeChange, today);
    click(dayButton(nodes, 1));

    nodes = renderCalendar(onRangeChange, today);
    click(
      nodes.find(
        (node) =>
          node.type === "button" &&
          Array.isArray(node.props.children) &&
          textOf(node.props.children).startsWith("1월"),
      ),
    );
    nodes = renderCalendar(onRangeChange, today);
    click(buttonByText(nodes, "6월"));

    nodes = renderCalendar(onRangeChange, today);
    const farFuture = dayButton(nodes, 1);
    expect(farFuture?.props.disabled).toBe(true);
    expect(farFuture?.props.title).toBe("오늘 이후 날짜는 선택할 수 없습니다");
    expect(farFuture?.props.onClick).toBeUndefined();
    expect(onRangeChange).not.toHaveBeenCalled();
  });
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
    expect(beyondLimit?.props["aria-label"]).toBe(
      "2026년 4월 3일 금요일, 선택 불가, 최대 92일까지 선택할 수 있습니다",
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

describe("AdminCalendar 기간 선택 취소", () => {
  it("선택 취소는 이전 표시로 돌아가고 조회를 바꾸지 않는다", () => {
    const onRangeChange = vi.fn();
    let nodes = renderCalendar(onRangeChange);

    expect(buttonByText(nodes, "선택 취소")).toBeUndefined();
    click(dayButton(nodes, 15));

    nodes = renderCalendar(onRangeChange);
    expect(dayButton(nodes, 15)?.props["aria-label"]).toBe(
      "2026년 1월 15일 목요일, 시작일",
    );
    expect(dayButton(nodes, 15)?.props["aria-pressed"]).toBeUndefined();
    expect(textOf(nodes[0])).toContain("종료일을 선택하세요");
    click(buttonByText(nodes, "선택 취소"));

    nodes = renderCalendar(onRangeChange);
    expect(buttonByText(nodes, "선택 취소")).toBeUndefined();
    expect(textOf(nodes[0])).not.toContain("종료일을 선택하세요");
    expect(textOf(nodes[0])).toContain("1월");
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("같은 날을 다시 누르면 하루 기간이 확정된다", () => {
    const onRangeChange = vi.fn();
    let nodes = renderCalendar(onRangeChange);

    click(dayButton(nodes, 15));
    nodes = renderCalendar(onRangeChange);
    click(dayButton(nodes, 15));

    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenCalledWith({
      start: parseLocalDateKey("2026-01-15"),
      end: parseLocalDateKey("2026-01-15"),
    });
  });

  it("피커가 열린 Esc는 피커만 닫고, 다음 Esc가 선택을 취소한다", () => {
    const onRangeChange = vi.fn();
    let nodes = renderCalendar(onRangeChange);
    click(dayButton(nodes, 15));

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
    expect(textOf(nodes[0])).toContain("12월");
    expect(buttonByText(nodes, "선택 취소")).toBeUndefined();
    const closePicker = pressEscape(nodes[0]);
    expect(closePicker).toHaveBeenCalledTimes(1);

    nodes = renderCalendar(onRangeChange);
    expect(textOf(nodes[0])).not.toContain("12월");
    expect(buttonByText(nodes, "선택 취소")).toBeDefined();

    const cancelSelection = pressEscape(nodes[0]);
    expect(cancelSelection).toHaveBeenCalledTimes(1);
    nodes = renderCalendar(onRangeChange);
    expect(buttonByText(nodes, "선택 취소")).toBeUndefined();
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("시작일이 없으면 Esc는 달력 상태를 바꾸지 않는다", () => {
    const onRangeChange = vi.fn();
    const nodes = renderCalendar(onRangeChange);
    const stop = pressEscape(nodes[0]);

    expect(stop).not.toHaveBeenCalled();
    expect(textOf(renderCalendar(onRangeChange)[0])).toContain("1월");
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it("다른 달로 이동한 뒤 취소해도 보고 있던 달을 유지한다", () => {
    const onRangeChange = vi.fn();
    let nodes = renderCalendar(onRangeChange);
    click(dayButton(nodes, 1));

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
    click(buttonByText(nodes, "4월"));

    nodes = renderCalendar(onRangeChange);
    expect(dayButton(nodes, 3)?.props.disabled).toBe(true);
    click(buttonByText(nodes, "선택 취소"));

    nodes = renderCalendar(onRangeChange);
    expect(
      nodes.find(
        (node) =>
          node.type === "button" &&
          Array.isArray(node.props.children) &&
          textOf(node.props.children).startsWith("4월"),
      ),
    ).toBeDefined();
    expect(dayButton(nodes, 3)?.props.disabled).toBeFalsy();
    expect(onRangeChange).not.toHaveBeenCalled();
  });
});
