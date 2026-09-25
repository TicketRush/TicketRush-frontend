import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import BannerSlide from "./BannerSlide";
import BannerSlider from "./BannerSlider";
import ConcertListPage from "@/pages/Concert/ConcertListPage";
import type { BannerItem } from "@/types/domain/banner";

const mocks = vi.hoisted(() => ({ query: vi.fn(), drive: vi.fn(),
  effects: [] as Array<() => void | (() => void)> }));
vi.mock("@/hooks/queries/useBanners", () => ({ useBanners: mocks.query }));
vi.mock("@/hooks/queries/useConcerts", () => ({ useConcerts: () => ({ data: { pages: [{ items: [] }] } }) }));
vi.mock("@/hooks/common/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("react", async (original) => ({
  ...await original<typeof React>(),
  useEffect: (effect: () => void | (() => void)) => { mocks.effects.push(effect); },
}));

type Element = React.ReactElement<Record<string, unknown>>;
function nodes(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...nodes(node.props.children as React.ReactNode)];
}
function DriveSlider() {
  const tree = BannerSlider();
  mocks.drive(tree);
  return tree;
}
function DriveSlide({ posterUrl }: { posterUrl?: string | null }) {
  const tree = BannerSlide({ banner, posterUrl });
  mocks.drive(tree);
  return tree;
}
const banner: BannerItem = {
  performanceId: 42, title: "공연 제목", subtitle: "공연 소제목", description: "공연 소개",
  date: "2027-01-01", imageUrl: "/poster.png", order: 1,
};
function render(child: React.ReactNode = <BannerSlider />) {
  return renderToStaticMarkup(<MemoryRouter>{child}</MemoryRouter>);
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.query.mockReturnValue({ data: [banner, { ...banner, performanceId: 91, title: "다음 공연", imageUrl: "/next.png" }] });
  mocks.drive.mockReset();
  mocks.effects = [];
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("renders existing text and date with the linked concert ID, keeping dots outside the link", () => {
  const html = render();
  for (const text of [banner.title, banner.subtitle!, banner.description!, banner.date!]) expect(html).toContain(text);
  expect(html).toContain('href="/concerts/42"');
  expect(html).toContain('aria-label="공연 제목 공연 상세 보기"');
  expect(html.indexOf("</a>")).toBeLessThan(html.indexOf("<button"));
  expect(html).toContain('aria-label="슬라이드 2로 이동"');
  expect(html).toContain('aria-current="true"');
});

it.each([0, -1, 1.5, NaN])("does not use banner ID as a concert ID when linked ID is %s", (performanceId) => {
  const html = render(<BannerSlide banner={{ ...banner, performanceId }} />);
  expect(html).not.toContain("<a ");
  expect(html).toContain(banner.title);
});

it("renders one named poster and a hidden decorative image using a API poster URL", () => {
  const html = render(<BannerSlide banner={banner} posterUrl="/poster.png" />);
  expect(html.match(/<img /g)).toHaveLength(2);
  expect(html).toContain('alt="공연 제목 대표 이미지"');
  expect(html).toContain('alt="" aria-hidden="true"');
});

it.each([undefined, null, "", "   "])("renders without broken or empty images when URL is %s", (posterUrl) => {
  const html = render(<BannerSlide banner={banner} posterUrl={posterUrl} />);
  expect(html).not.toContain("<img");
  expect(html).toContain(banner.title);
});

it("removes both image layers on poster failure", () => {
  let failed = false;
  mocks.drive.mockImplementation((tree: React.ReactNode) => {
    if (failed) return;
    failed = true;
    const poster = nodes(tree).find((node) => node.type === "img" && node.props.alt)!;
    (poster.props.onError as () => void)();
  });
  expect(render(<DriveSlide posterUrl="/broken.png" />)).not.toContain("<img");
});

it("changes slides through dots without activating the detail link", () => {
  let changed = false;
  mocks.drive.mockImplementation((tree: React.ReactNode) => {
    if (changed) return;
    changed = true;
    const dot = nodes(tree).find((node) => node.props["aria-label"] === "슬라이드 2로 이동")!;
    (dot.props.onClick as () => void)();
  });
  const html = render(<DriveSlider />);
  expect(html).toContain("다음 공연");
  expect(html).toContain('href="/concerts/91"');
});

it("auto advances after four seconds and cleans up the interval", () => {
  vi.useFakeTimers();
  let advanced = false;
  let cleanup: void | (() => void);
  mocks.drive.mockImplementation(() => {
    if (advanced) return;
    advanced = true;
    cleanup = mocks.effects[0]();
    vi.advanceTimersByTime(4000);
  });
  expect(render(<DriveSlider />)).toContain("다음 공연");
  cleanup!();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(["onMouseEnter", "onFocus"])("pauses automatic advancement on %s", (event) => {
  vi.useFakeTimers();
  let paused = false;
  mocks.drive.mockImplementation((tree: Element) => {
    if (paused) return;
    paused = true;
    (tree.props[event] as () => void)();
  });
  render(<DriveSlider />);
  expect(mocks.effects.at(-1)!()).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
});

it("preserves loading, empty and error behavior", () => {
  mocks.query.mockReturnValue({ isPending: true });
  expect(render()).toContain("animate-pulse");
  mocks.query.mockReturnValue({ data: [] });
  expect(render()).toBe("");
  mocks.query.mockReturnValue({ data: [banner], isError: true });
  expect(render()).toBe("");
});

it("keeps the banner visible on Home even with an empty concert list", () => {
  const html = render(<ConcertListPage />);
  expect(html).toContain("등록된 공연이 없습니다.");
  expect(html).toContain(banner.title);
  expect(html).toContain('href="/concerts/42"');
});

it("connects the API image to both layers through the slider", () => {
  const html = render();
  expect(html.match(/<img /g)).toHaveLength(2);
  expect(html.match(/<img[^>]*src="\/poster.png"/g)).toHaveLength(2);
  expect(html).toContain("object-contain");
  expect(html).toContain("blur-2xl");
});
it.each([null, undefined, ""])("omits an absent subtitle without leaving an empty paragraph (%s)", (subtitle) => {
  const html = render(<BannerSlide banner={{ ...banner, subtitle }} />);
  expect(html).not.toContain("line-clamp-2");
  expect(html).toContain(banner.title);
});
it("uses performance identity for slides and dots across reorder", () => {
  for (const items of [[banner, { ...banner, performanceId: 91 }], [{ ...banner, performanceId: 91 }, banner]]) {
    mocks.query.mockReturnValue({ data: items });
    mocks.drive.mockImplementation((tree: React.ReactNode) => {
      const elements = nodes(tree);
      expect(elements.find((node) => node.type === BannerSlide)?.key).toBe(String(items[0].performanceId));
      expect(elements.filter((node) => node.type === "button").map((node) => node.key)).toEqual(items.map((item) => String(item.performanceId)));
    });
    render(<DriveSlider />);
  }
});
