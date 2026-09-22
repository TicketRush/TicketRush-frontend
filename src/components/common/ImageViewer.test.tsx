import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import createReconciler from "@react-three/fiber/react-reconciler";
import ImageViewer from "./ImageViewer";
import { resetBodyScrollLock } from "@/utils/dom/bodyScrollLock";

const lifecycle = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)>, failImage: false }));
vi.mock("react", async (original) => ({
  ...await original<typeof React>(),
  useEffect: (effect: () => void | (() => void)) => { lifecycle.effects.push(effect); },
}));
vi.mock("react-dom", async (original) => ({
  ...await original<typeof import("react-dom")>(),
  createPortal: (children: React.ReactNode) => children,
}));
vi.mock("focus-trap-react", () => ({ FocusTrap: ({ children }: { children: React.ReactNode }) => children }));

type Element = React.ReactElement<Record<string, unknown>>;
const captured: Element[] = [];
vi.mock("react/jsx-dev-runtime", async (original) => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    if (typeof args[0] === "function" && args[0].name === "ViewerImage" && lifecycle.failImage) {
      const Component = args[0] as React.FunctionComponent;
      return actual.jsxDEV(function FailImage() {
        const tree = Component(args[1]) as React.ReactElement<{ onError?: () => void }>;
        if (tree.type === "img") tree.props.onError!();
        return tree;
      }, {}, args[2], false);
    }
    const element = actual.jsxDEV(...args);
    if (typeof args[0] === "string") captured.push(element);
    return element;
  } };
});

beforeEach(() => {
  lifecycle.effects = [];
  lifecycle.failImage = false;
  captured.length = 0;
  vi.stubGlobal("React", React);
  vi.stubGlobal("document", {
    body: { style: { overflow: "auto", paddingRight: "8px", position: "relative", top: "", left: "", width: "" } },
    documentElement: { style: { overflow: "scroll" }, clientWidth: 1000 },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  });
  vi.stubGlobal("window", { innerWidth: 1015, scrollY: 240,
    getComputedStyle: () => ({ paddingRight: "8px" }), scrollTo: vi.fn() });
});
afterEach(() => { resetBodyScrollLock(); vi.unstubAllGlobals(); });

function setup(open = true, imageUrl = "/image.png") {
  const onClose = vi.fn();
  const html = renderToStaticMarkup(<ImageViewer open={open} imageUrl={imageUrl} alt="공연 사진" onClose={onClose} />);
  const cleanups = lifecycle.effects.map((effect) => effect());
  const cleanup = () => cleanups.forEach((fn) => fn?.());
  const dialog = captured.find((element) => element.props.role === "dialog");
  const button = captured.find((element) => element.type === "button");
  return { html, onClose, cleanup, dialog, button };
}

it("renders a viewport-contained image and accessible dialog with a close button", () => {
  const ui = setup();
  expect(ui.html).toContain('role="dialog"');
  expect(ui.html).toContain('aria-modal="true"');
  expect(ui.html).toContain('aria-label="이미지 전체보기 닫기"');
  expect(ui.html).toContain('alt="공연 사진"');
  expect(ui.html).toContain('src="/image.png"');
  expect(ui.html).toContain("object-contain");
  expect(ui.html).toContain("100dvh-7rem");
  (ui.button!.props.onClick as () => void)();
  expect(ui.onClose).toHaveBeenCalledOnce();
  ui.cleanup();
});

it("closes only for the backdrop itself, not clicks bubbling from the image", () => {
  const ui = setup();
  const onClick = ui.dialog!.props.onClick as (event: unknown) => void;
  const backdrop = {};
  onClick({ currentTarget: backdrop, target: { tagName: "IMG" } });
  expect(ui.onClose).not.toHaveBeenCalled();
  onClick({ currentTarget: backdrop, target: backdrop });
  expect(ui.onClose).toHaveBeenCalledOnce();
  ui.cleanup();
});

it("keeps the close action available when the full-size image fails", () => {
  lifecycle.failImage = true;
  const ui = setup();
  expect(ui.html).toContain("이미지를 불러올 수 없습니다.");
  expect(ui.html).not.toContain('<img');
  (ui.button!.props.onClick as () => void)();
  expect(ui.onClose).toHaveBeenCalledOnce();
  ui.cleanup();
});

it("handles Escape only and removes its listener and restores body styles on cleanup", () => {
  const original = { ...document.body.style };
  const ui = setup();
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.body.style.paddingRight).toBe("23px");
  const listener = vi.mocked(document.addEventListener).mock.calls.find(([name]) => name === "keydown")![1] as (event: { key: string }) => void;
  listener({ key: "Enter" });
  expect(ui.onClose).not.toHaveBeenCalled();
  listener({ key: "Escape" });
  expect(ui.onClose).toHaveBeenCalledOnce();
  ui.cleanup();
  expect(document.removeEventListener).toHaveBeenCalledWith("keydown", listener);
  expect(document.body.style).toEqual(original);
  expect(document.documentElement.style.overflow).toBe("scroll");
  expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
});

it.each([[false, "/image.png"], [true, "   "]])("does not render or register effects when hidden (%s, %s)", (open, url) => {
  const ui = setup(open as boolean, url as string);
  expect(ui.html).toBe("");
  expect(document.addEventListener).not.toHaveBeenCalled();
  expect(document.body.style.overflow).toBe("auto");
  ui.cleanup();
});

// Keep one React root across updates: fresh SSR renders cannot test keyed state reset.
function createViewerRoot() {
  type Node = { type: string; props: Record<string, unknown>; children: Node[] };
  const container: Node = { type: "root", props: {}, children: [] };
  const append = (parent: Node, child: Node) => { parent.children.push(child); };
  const remove = (parent: Node, child: Node) => { parent.children.splice(parent.children.indexOf(child), 1); };
  const context = {};
  const renderer = createReconciler({
    supportsMutation: true, isPrimaryRenderer: false,
    getRootHostContext: () => context, getChildHostContext: () => context,
    getPublicInstance: (node: Node) => node,
    createInstance: (type: string, props: Record<string, unknown>) => ({ type, props, children: [] }),
    createTextInstance: (text: string) => ({ type: "text", props: { text }, children: [] }),
    appendInitialChild: append, appendChild: append, appendChildToContainer: append,
    removeChild: remove, removeChildFromContainer: remove,
    clearContainer: (node: Node) => { node.children = []; },
    shouldSetTextContent: () => false, finalizeInitialChildren: () => false,
    prepareForCommit: () => null, resetAfterCommit: () => {},
    commitUpdate: (node: Node, _type: string, _old: unknown, props: Record<string, unknown>) => { node.props = props; },
    commitTextUpdate: (node: Node, _old: string, text: string) => { node.props.text = text; },
    getCurrentUpdatePriority: () => 2, setCurrentUpdatePriority: () => {}, resolveUpdatePriority: () => 2,
    resolveEventTimeStamp: () => -1, resolveEventType: () => null,
    trackSchedulerEvent: () => {}, shouldAttemptEagerTransition: () => false,
    maySuspendCommit: () => false, preloadInstance: () => true,
    detachDeletedInstance: () => {},
    scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1,
  } as unknown as Parameters<typeof createReconciler>[0]);
  const onError = (error: unknown) => { throw error; };
  const root = renderer.createContainer(container, 1, null, false, null, "", onError, onError, onError, null);
  const update = (element: React.ReactNode) => {
    renderer.updateContainerSync(element, root, null, null);
    renderer.flushSyncWork();
  };
  const nodes = (node: Node): Node[] => [node, ...node.children.flatMap(nodes)];
  return {
    render: (open: boolean, imageUrl: string, alt: string) => update(
      <ImageViewer open={open} imageUrl={imageUrl} alt={alt} onClose={() => update(null)} />,
    ),
    nodes: () => nodes(container),
    failImage: () => {
      (nodes(container).find((node) => node.type === "img")!.props.onError as () => void)();
      renderer.flushSyncWork();
    },
    unmount: () => update(null),
  };
}

it.each([false, true])("resets A's error for B on the same root (close first: %s)", (closeFirst) => {
  const ui = createViewerRoot();
  try {
    ui.render(true, "https://example.com/a.jpg", "Image A");
    ui.failImage();
    expect(ui.nodes().some((node) => node.props.text === "이미지를 불러올 수 없습니다.")).toBe(true);
    expect(ui.nodes().some((node) => node.type === "img")).toBe(false);
    if (closeFirst) {
      ui.render(false, "https://example.com/a.jpg", "Image A");
      expect(ui.nodes()).toHaveLength(1);
    }
    ui.render(true, "https://example.com/b.jpg", "Image B");
    expect(ui.nodes().filter((node) => node.type === "img").map((node) => node.props)).toEqual([
      expect.objectContaining({ src: "https://example.com/b.jpg", alt: "Image B" }),
    ]);
    expect(ui.nodes().some((node) => node.props.role === "status")).toBe(false);
    expect(ui.nodes().some((node) => node.props.text === "이미지를 불러올 수 없습니다.")).toBe(false);
  } finally { ui.unmount(); }
});
