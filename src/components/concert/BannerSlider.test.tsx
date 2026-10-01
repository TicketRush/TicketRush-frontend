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

const threeBanners = [banner,
  { ...banner, performanceId: 91, title: "두 번째 공연" },
  { ...banner, performanceId: 92, title: "세 번째 공연" },
];

it("renders named translucent arrows outside the detail link and above the separate dots", () => {
  const html = render();
  const link = html.slice(html.indexOf("<a "), html.indexOf("</a>"));
  expect(link).not.toContain("<button");
  for (const label of ["이전 배너", "다음 배너"]) expect(html).toContain(`aria-label="${label}"`);
  mocks.drive.mockImplementation((tree: React.ReactNode) => {
    for (const label of ["이전 배너", "다음 배너"]) {
      const arrow = nodes(tree).find(node => node.props["aria-label"] === label)!;
      expect(arrow.type).toBe("button");
      expect(arrow.props.type).toBe("button");
      const tokens = String(arrow.props.className).split(/\s+/);
      for (const token of ["absolute", "top-1/2", "-translate-y-1/2", "z-10", "bg-black/30", "hover:bg-black/50", "focus-visible:outline", "rounded-full", "h-8", "sm:h-10"]) expect(tokens).toContain(token);
      expect(nodes(arrow).some(node => node.props["aria-hidden"] === "true")).toBe(true);
    }
  });
  render(<DriveSlider />);
});

it.each([{ items: [] }, { items: [banner] }])("hides arrows and dots with $items.length banners", ({ items }) => {
  mocks.query.mockReturnValue({ data: items });
  const html = render();
  expect(html).not.toContain("<button");
  vi.useFakeTimers();
  expect(mocks.effects.at(-1)!()).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([
  [["다음 배너"], [0, 1]],
  [["이전 배너"], [0, 2]],
  [["이전 배너", "다음 배너"], [0, 2, 0]],
  [["슬라이드 3로 이동", "이전 배너", "다음 배너", "다음 배너"], [0, 2, 1, 2, 0]],
] as const)("keeps content and dots synchronized through %j", (actions, expected) => {
  mocks.query.mockReturnValue({ data: threeBanners });
  let step = 0;
  mocks.drive.mockImplementation((tree: React.ReactNode) => {
    const elements = nodes(tree);
    const index = expected[step];
    expect(elements.find(node => node.type === BannerSlide)?.props.banner).toBe(threeBanners[index]);
    const active = elements.filter(node => node.props["aria-current"] === "true");
    expect(active).toHaveLength(1);
    expect(active[0].props["aria-label"]).toBe(`슬라이드 ${index + 1}로 이동`);
    const action = actions[step++];
    if (action) (elements.find(node => node.props["aria-label"] === action)!.props.onClick as () => void)();
  });
  const html = render(<DriveSlider />);
  expect(html).toContain(threeBanners[expected.at(-1)!].title);
  expect(step).toBe(expected.length);
});

it("handles rapid arrows with functional updates and continues the existing timer", () => {
  mocks.query.mockReturnValue({ data: threeBanners });
  vi.useFakeTimers();
  let step = 0;
  let cleanup: void | (() => void);
  mocks.drive.mockImplementation((tree: React.ReactNode) => {
    if (step++ === 0) {
      cleanup = mocks.effects[0]();
      const next = nodes(tree).find(node => node.props["aria-label"] === "다음 배너")!.props.onClick as () => void;
      next(); next();
      expect(vi.getTimerCount()).toBe(1);
    } else if (step === 2) {
      expect(nodes(tree).find(node => node.type === BannerSlide)?.props.banner).toBe(threeBanners[2]);
      vi.advanceTimersByTime(4000);
    }
  });
  expect(render(<DriveSlider />)).toContain('href="/concerts/42"');
  cleanup!();
  expect(vi.getTimerCount()).toBe(0);
});

it("moves content inward using responsive padding while retaining poster and typography policies", () => {
  mocks.drive.mockImplementation((tree: React.ReactNode) => {
    const elements = nodes(tree);
    const content = elements.find(node => String(node.props.className).split(/\s+/).includes("min-h-48"))!;
    const tokens = String(content.props.className).split(/\s+/);
    for (const token of ["px-10", "py-5", "sm:px-14", "sm:py-8", "lg:px-16", "gap-4", "sm:gap-6"]) expect(tokens).toContain(token);
    expect(tokens).not.toContain("text-center");
    const poster = elements.find(node => node.type === "img" && node.props.alt)!;
    for (const token of ["w-1/3", "max-h-40", "sm:max-h-56", "object-contain", "object-right"]) expect(String(poster.props.className).split(/\s+/)).toContain(token);
  });
  render(<DriveSlide posterUrl="/poster.png" />);
});

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
      expect(elements.filter((node) => String(node.props["aria-label"]).startsWith("슬라이드 ")).map((node) => node.key)).toEqual(items.map((item) => String(item.performanceId)));
    });
    render(<DriveSlider />);
  }
});
