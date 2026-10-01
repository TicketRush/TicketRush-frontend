import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ConcertCard from "./ConcertCard";
import type { ConcertSummary } from "@/types/domain/concert";
import samplePoster from "@/assets/images/sample-poster.svg";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), elements: [] as Array<{ type: unknown; props: Record<string, unknown> }> }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("react/jsx-dev-runtime", async original => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    mocks.elements.push({ type: args[0], props: args[1] });
    return actual.jsxDEV(...args);
  } };
});
const concert: ConcertSummary = {
  id: 42, title: "공연 제목", performer: "출연진", genre: "CLASSIC",
  showDate: "2027-01-01", showTime: "19:30", address: "서울",
  price: 10000, imageMainUrl: "/poster.png", status: "ON_SALE",
};
beforeEach(() => { vi.stubGlobal("React", React); mocks.elements = []; mocks.navigate.mockClear(); });
afterEach(() => vi.unstubAllGlobals());

function render(imageMainUrl = concert.imageMainUrl) {
  return renderToStaticMarkup(<ConcertCard concert={{ ...concert, imageMainUrl }} />);
}
function tokens(props: Record<string, unknown>) { return String(props.className).split(/\s+/); }

// These assert CSS contracts, not pixel measurements or image decoding in Node.
it.each([[1200, 600], [600, 1200], [800, 800], [40, 20], [4000, 8000]])(
  "keeps an independent 4:3 frame for a %ix%i source",
  (width, height) => {
    const src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`)}`;
    render(src);
    const image = mocks.elements.find(element => element.type === "img")!.props;
    const frame = mocks.elements.find(element => tokens(element.props).includes("aspect-[4/3]"))!.props;
    for (const token of ["relative", "w-full", "aspect-[4/3]", "overflow-hidden", "shrink-0"]) expect(tokens(frame)).toContain(token);
    for (const token of ["absolute", "inset-0", "block", "w-full", "h-full", "object-cover"]) expect(tokens(image)).toContain(token);
    expect(image.src).toBe(src);
    expect(image.width).toBeUndefined();
    expect(image.height).toBeUndefined();
    expect(image.style).toBeUndefined();
    expect(image.alt).toBe("공연 제목 포스터");
  },
);

it("keeps missing and failed image fallbacks in the same frame", () => {
  render("");
  const image = mocks.elements.find(element => element.type === "img")!.props;
  expect(image.src).toBe(samplePoster);
  const target = { src: "/broken.png" };
  (image.onError as (event: { target: typeof target }) => void)({ target });
  expect(target.src).toBe(samplePoster);
  expect(tokens(image)).toEqual(expect.arrayContaining(["absolute", "w-full", "h-full", "object-cover"]));
});

it("preserves card content, pointer navigation and keyboard navigation", () => {
  const html = render();
  for (const text of ["공연 제목", "출연진", "서울", "10,000", "예매하기"]) expect(html).toContain(text);
  const article = mocks.elements.find(element => element.type === "article")!.props;
  expect(article.role).toBe("link");
  expect(article.tabIndex).toBe(0);
  (article.onClick as () => void)();
  const preventDefault = vi.fn();
  for (const key of ["Enter", " "]) (article.onKeyDown as (event: { key: string; preventDefault: () => void }) => void)({ key, preventDefault });
  expect(mocks.navigate).toHaveBeenCalledTimes(3);
  expect(mocks.navigate).toHaveBeenLastCalledWith("/concerts/42");
  expect(preventDefault).toHaveBeenCalledTimes(2);
});
