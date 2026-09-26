import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AdminCharacterCreatorPage from "./AdminCharacterCreatorPage";

// Exercise the page's actual input callbacks in the existing Node test environment.
// State slots persist across explicit renders; no DOM dependency is required.
const harness = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, navigate: vi.fn(), save: vi.fn(), viewer: vi.fn(() => null) }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useLayoutEffect: () => {},
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.values)) harness.values[index] = typeof initial === "function" ? initial() : initial;
    return [harness.values[index], (next: unknown) => {
      harness.values[index] = typeof next === "function" ? next(harness.values[index]) : next;
    }];
  },
}));
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ state: {} }),
  useNavigate: () => harness.navigate,
  useSearchParams: () => [new URLSearchParams("returnTo=/admin/concerts/42/edit")],
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("@/components/admin/character/CharacterModelViewer", () => ({ default: harness.viewer }));

type Element = React.ReactElement<Record<string, unknown>>;
function all(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(all);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...all(node.props.children as React.ReactNode)];
}
function render() {
  harness.cursor = 0;
  return all(AdminCharacterCreatorPage());
}
function control(part: string) {
  return render().find((node) => node.props.idPrefix === `jazz-${part}`)!.props;
}

function renderViewer() {
  harness.cursor = 0;
  harness.viewer.mockClear();
  renderToStaticMarkup(AdminCharacterCreatorPage());
  expect(harness.viewer).toHaveBeenCalledTimes(1);
}

// Node has no native DOM/color dialog. Exercise the real input element's
// onChange adapter, rather than calling the control's color/HEX callback.
function changeInput(part: string, kind: "color-picker" | "hex", value: string) {
  const element = render().find((node) => node.props.idPrefix === `jazz-${part}`)!;
  const component = element.type as React.FunctionComponent<Record<string, unknown>>;
  const input = all(component(element.props) as React.ReactNode).find(
    (node) => node.type === "input" && node.props.id === `jazz-${part}-${kind}`,
  )!;
  expect(input.props.type).toBe(kind === "color-picker" ? "color" : "text");
  (input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}

beforeEach(() => {
  harness.values = [];
  harness.navigate.mockClear();
  harness.save.mockClear();
  harness.viewer.mockClear();
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF" }),
    setItem: harness.save,
  });
});
afterEach(() => vi.unstubAllGlobals());

it.each([["인사", "wave"], ["큐트", "cute"], ["입 가리기", "cover_mouth"]])(
  "restarts %s on every click without changing saved customization",
  (label, id) => {
    const click = () => {
      const button = render().find(node => node.type === "button" && node.props["aria-label"] === label)!;
      (button.props.onClick as () => void)();
    };
    click();
    renderViewer();
    expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({
      animationRequest: { id, sequence: 1 }, outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF",
    }), undefined);
    click();
    renderViewer();
    expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({
      animationRequest: { id, sequence: 2 }, outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF",
    }), undefined);
    expect(harness.save).not.toHaveBeenCalled();
  },
);

const rgb = { jazzShirtColor: "#FF0000", jazzInnerColor: "#00FF00", jazzPantsColor: "#0000FF" };

it.each(["standing", "wave", "heart", "dance", "sing"])(
  "loads legacy pose %s without autoplay and keeps playback out of applied settings",
  pose => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF", pose }),
      setItem: harness.save,
    });
    renderViewer();
    expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({ animationRequest: undefined }), undefined);
    for (const [index, label] of ["인사", "큐트", "입 가리기"].entries()) {
      const button = render().find(node => node.type === "button" && node.props["aria-label"] === label)!;
      (button.props.onClick as () => void)();
      renderViewer();
      expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({
        animationRequest: { id: ["wave", "cute", "cover_mouth"][index], sequence: index + 1 },
      }), undefined);
    }
    const apply = render().find(node => node.type === "button" && String(node.props.children).includes("제작값 적용"))!;
    (apply.props.onClick as () => void)();
    const saved = JSON.parse(harness.save.mock.calls[0][1]);
    expect(saved).toMatchObject({ pose, outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF" });
    expect(saved).not.toHaveProperty("animationRequest");
    expect(saved).not.toHaveProperty("sequence");
    expect(harness.navigate).toHaveBeenCalledWith("/admin/concerts/42/edit", { state: { characterConfig: saved } });
  },
);
function loadRgb() {
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ outfitModelId: "rainbow-blouse", ...rgb }),
    setItem: harness.save,
  });
}

function chooseOutfit(label: string) {
  const section = render().find(node => node.props.title === "의상 선택")!;
  const cards = all(section.props.children as React.ReactNode).filter(node => typeof node.type === "function" && node.props.onClick && all(node.props.children as React.ReactNode).some(child => child.props.children === label));
  expect(cards).toHaveLength(1);
  const card = cards[0];
  const button = all((card.type as React.FunctionComponent<Record<string, unknown>>)(card.props)).find(node => node.type === "button")!;
  (button.props.onClick as () => void)();
}

it("selects classic, changes its color, applies and restores the same legacy ID without persisting playback", () => {
  chooseOutfit("클래식");
  const colorControl = render().find(node => node.props.idPrefix === "outfit")!;
  const input = all((colorControl.type as React.FunctionComponent<Record<string, unknown>>)(colorControl.props))
    .find(node => node.type === "input" && node.props.type === "color")!;
  (input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "#123ABC" } });
  for (const [label, id] of [["인사", "wave"], ["큐트", "cute"], ["입 가리기", "cover_mouth"]]) {
    const button = render().find(node => node.type === "button" && node.props["aria-label"] === label)!;
    (button.props.onClick as () => void)();
    renderViewer();
    expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({ outfitModelId: "classic", outfitColor: "#123ABC", animationRequest: expect.objectContaining({ id }) }), undefined);
  }
  const apply = render().find(node => node.type === "button" && String(node.props.children).includes("제작값 적용"))!;
  (apply.props.onClick as () => void)();
  const saved = JSON.parse(harness.save.mock.calls[0][1]);
  expect(saved).toMatchObject({ outfitModelId: "classic", outfitColor: "#123ABC" });
  expect(saved).not.toHaveProperty("animationRequest");
  expect(JSON.stringify(saved)).not.toContain(".glb");
  harness.values = [];
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(saved), setItem: harness.save });
  renderViewer();
  expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({ outfitModelId: "classic", outfitColor: "#123ABC", animationRequest: undefined }), undefined);
  const restored = render().find(node => node.props.selected === true && all(node.props.children as React.ReactNode).some(child => child.props.children === "클래식"));
  expect(restored).toBeDefined();
  chooseOutfit("재즈");
  renderViewer();
  expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({ outfitModelId: "rainbow-blouse" }), undefined);
  chooseOutfit("클래식");
  chooseOutfit("클래식");
  renderViewer();
  expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({ outfitModelId: "classic", outfitColor: "#123ABC" }), undefined);
});

it("passes all three distinct jazz colors to the actual viewer mock", () => {
  loadRgb();
  renderViewer();
  expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({ outfitModelId: "rainbow-blouse", ...rgb }), undefined);
});

it.each([
  ["shirt", "jazzShirtColor", "color-picker", "#123456", "#123456"],
  ["inner", "jazzInnerColor", "color-picker", "#234567", "#234567"],
  ["pants", "jazzPantsColor", "color-picker", "#345678", "#345678"],
  ["shirt", "jazzShirtColor", "hex", "abcdef", "#ABCDEF"],
  ["inner", "jazzInnerColor", "hex", "#bcdef0", "#BCDEF0"],
  ["pants", "jazzPantsColor", "hex", "cdef01", "#CDEF01"],
] as const)("updates only %s's viewer prop through the %s field using %s", (part, field, kind, value, expected) => {
  loadRgb();
  renderViewer();
  expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining(rgb), undefined);
  changeInput(part, kind, value);
  renderViewer();
  expect(harness.viewer).toHaveBeenLastCalledWith(expect.objectContaining({
    outfitModelId: "rainbow-blouse",
    ...rgb,
    [field]: expected,
  }), undefined);
});

it("applies each HEX input independently and saves the same colors for the edit return", () => {
  for (const [part, hex] of [["shirt", "ff0000"], ["inner", "00ff00"], ["pants", "0000ff"]]) {
    (control(part).onHexChange as (value: string) => void)(hex);
    expect(control(part).currentColor).toBe(`#${hex.toUpperCase()}`);
  }
  expect(control("shirt").currentColor).toBe("#FF0000");
  expect(control("inner").currentColor).toBe("#00FF00");
  expect(control("pants").currentColor).toBe("#0000FF");
  const apply = render().find((node) => node.type === "button" && String(node.props.children).includes("제작값 적용"))!;
  (apply.props.onClick as () => void)();
  const saved = JSON.parse(harness.save.mock.calls[0][1]);
  expect(saved).toMatchObject({ outfitModelId: "rainbow-blouse", jazzShirtColor: "#FF0000", jazzInnerColor: "#00FF00", jazzPantsColor: "#0000FF" });
  expect(harness.navigate).toHaveBeenCalledWith("/admin/concerts/42/edit", { state: { characterConfig: saved } });
});

it("preserves the last valid color for invalid HEX and restores it on blur", () => {
  (control("shirt").onHexChange as (value: string) => void)("XYZ");
  expect(control("shirt").currentColor).toBe("#ABCDEF");
  expect(control("shirt").hexError).not.toBe("");
  (control("shirt").onHexBlur as () => void)();
  expect(control("shirt").hexInput).toBe("#ABCDEF");
  expect(control("shirt").hexError).toBe("");
  expect(control("inner").currentColor).toBe("#ABCDEF");
  expect(control("pants").currentColor).toBe("#ABCDEF");
});
