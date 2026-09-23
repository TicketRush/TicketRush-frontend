import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SeatMapPopover from "./SeatMapPopover";
import { resetBodyScrollLock } from "@/utils/dom/bodyScrollLock";

const lifecycle = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
}));

vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useEffect: (effect: () => void | (() => void)) => {
    lifecycle.effects.push(effect);
  },
}));
vi.mock("react-dom", async (original) => ({
  ...(await original<typeof import("react-dom")>()),
  createPortal: (children: React.ReactNode) => children,
}));
vi.mock("focus-trap-react", () => ({
  FocusTrap: ({ children }: { children: React.ReactNode }) => children,
}));

type Element = React.ReactElement<Record<string, unknown>>;
const captured: Element[] = [];
vi.mock("react/jsx-dev-runtime", async (original) => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      const element = actual.jsxDEV(...args);
      if (typeof args[0] === "string") captured.push(element);
      return element;
    },
  };
});

beforeEach(() => {
  lifecycle.effects = [];
  captured.length = 0;
  vi.stubGlobal("React", React);
  vi.stubGlobal("document", {
    body: {
      style: {
        overflow: "auto",
        paddingRight: "8px",
        position: "relative",
        top: "",
        left: "",
        width: "",
      },
    },
    documentElement: { style: { overflow: "scroll" }, clientWidth: 1000 },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("window", {
    innerWidth: 1015,
    scrollY: 240,
    getComputedStyle: () => ({ paddingRight: "8px" }),
    scrollTo: vi.fn(),
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
  });
});
afterEach(() => {
  resetBodyScrollLock();
  vi.unstubAllGlobals();
});

function setup() {
  const onClose = vi.fn();
  const html = renderToStaticMarkup(
    <SeatMapPopover seatLabel="B-4" onClose={onClose} />,
  );
  const cleanups = lifecycle.effects.map((effect) => effect());
  const cleanup = () => cleanups.forEach((fn) => fn?.());
  const dialog = captured.find((element) => element.props.role === "dialog");
  const backdrop = captured.find(
    (element) =>
      typeof element.props.className === "string" &&
      element.props.className.includes("min-h-full"),
  );
  const button = captured.find((element) => element.type === "button");
  return { html, onClose, cleanup, dialog, backdrop, button };
}

it("locks background scroll with scrollbar compensation while the seat map is open", () => {
  const ui = setup();

  expect(ui.html).toContain('role="dialog"');
  expect(ui.html).toContain('aria-modal="true"');
  expect(ui.html).toContain("좌석 위치");
  expect(ui.html).toContain("B-4");
  expect(ui.html).toContain("overscroll-contain");
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.body.style.position).toBe("fixed");
  expect(document.body.style.top).toBe("-240px");
  expect(document.body.style.paddingRight).toBe("23px");
  expect(document.documentElement.style.overflow).toBe("hidden");
  ui.cleanup();
});

it("restores the previous scroll position when the popover closes", () => {
  const original = { ...document.body.style };
  const ui = setup();

  ui.cleanup();

  expect(document.body.style).toEqual(original);
  expect(document.documentElement.style.overflow).toBe("scroll");
  expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
});

it("closes on Escape and ignores the backdrop until the open-click guard passes", () => {
  const ui = setup();
  const listener = vi
    .mocked(document.addEventListener)
    .mock.calls.find(([name]) => name === "keydown")![1] as (event: {
    key: string;
  }) => void;

  listener({ key: "Enter" });
  expect(ui.onClose).not.toHaveBeenCalled();

  (ui.backdrop!.props.onClick as () => void)();
  expect(ui.onClose).not.toHaveBeenCalled();

  listener({ key: "Escape" });
  expect(ui.onClose).toHaveBeenCalledOnce();
  (ui.button!.props.onClick as () => void)();
  expect(ui.onClose).toHaveBeenCalledTimes(2);

  ui.cleanup();
  expect(document.removeEventListener).toHaveBeenCalledWith("keydown", listener);
});
