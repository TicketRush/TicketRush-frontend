import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConcertDetailPage from "./ConcertDetailPage";
import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
import ImageViewer from "@/components/common/ImageViewer";
import type { ConcertDetail } from "@/types/domain/concert";
import { createCharacterConfig, restoreCharacterDraft } from "@/utils/character/characterConfig";

const mocks = vi.hoisted(() => ({ detail: vi.fn(), viewer: vi.fn(), drive: vi.fn() }));
vi.mock("@/components/common/ImageViewer", () => ({ default: () => null }));
vi.mock("@/hooks/queries/useConcertDetail", () => ({ useConcertDetail: mocks.detail }));
vi.mock("@/hooks/queries/useConcertListItem", () => ({ useConcertListItem: () => undefined }));
vi.mock("@/hooks/queries/useSeats", () => ({ useSeatCounts: () => ({
  data: { availableCount: 10, totalCount: 20, soldCount: 10 },
  isLoading: false, isError: false,
}) }));
vi.mock("@/hooks/common/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("@/stores/reservation/concertStore", () => ({ useConcertStore: () => vi.fn() }));
vi.mock("@/components/admin/character/CharacterModelViewer", () => ({ default: mocks.viewer }));

const config = createCharacterConfig(restoreCharacterDraft({
  outfitModelId: "theater", skinColor: "#ABCDEF", skinTone: "custom",
  hairStyle: "wave", eyeStyle: "wink", mouthStyle: "CAT", hairColor: "#123456",
  outfitColor: "#234567", balletWearColor: "#345678", balletShortsColor: "#456789",
  jacketColor: "#56789A", innerColor: "#6789AB", bottomColor: "#789ABC",
  musicalJacketColor: "#89ABCD", musicalInnerColor: "#9ABCDE", musicalShortsColor: "#ABCDEF",
  festivalTopColor: "#BCDEF0", festivalBottomColor: "#CDEF01",
  fanmeetCardiganColor: "#DEF012", fanmeetInnerColor: "#EF0123",
  fanmeetShortsColor: "#F01234", fanmeetSkirtColor: "#012345", background: "#112233",
})!);
const concert: ConcertDetail = {
  id: 42, title: "API 공연", performer: "API 출연진", genre: "FANMEETING",
  showDate: "2027-01-01", showTime: "19:30", durationMinutes: 90,
  price: 10000, totalSeats: 20, status: "ON_SALE", address: "서울",
  description: "API 소개", facilities: [], imageMainUrl: "/poster.png",
  imageGalleryUrls: ["/gallery.png"], characterConfig: config, characterMessage: " API 한마디 ",
};

beforeEach(() => {
  mocks.drive.mockReset();
  vi.stubGlobal("React", React);
  mocks.viewer.mockReset().mockReturnValue(<span>viewer</span>);
  mocks.detail.mockReturnValue({ data: concert, isLoading: false, isError: false });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function DrivePage() {
  const tree = ConcertDetailPage();
  mocks.drive(tree);
  return tree;
}

function render(overrides: Record<string, unknown> = {}) {
  mocks.detail.mockReturnValue({ data: { ...concert, ...overrides }, isLoading: false, isError: false });
  return renderToStaticMarkup(<MemoryRouter initialEntries={["/concerts/42"]}>
    <Routes><Route path="/concerts/:id" element={mocks.drive.getMockImplementation() ? <DrivePage /> : <ConcertDetailPage />} /></Routes>
  </MemoryRouter>);
}

function expectBody(html: string) {
  for (const value of ["API 공연", "API 출연진", "2027-01-01", "10,000", "API 소개", "/gallery.png", "예매"]) {
    expect(html).toContain(value);
  }
}

describe("image full view (#354)", () => {
  it.each([["포스터", "/poster.png"], ["갤러리 1", "/a.png"], ["갤러리 2", "/b.png"], ["갤러리 3", "/c.png"]])("opens %s in the shared viewer and closes it", (label, url) => {
    type Element = React.ReactElement<Record<string, unknown>>;
    function nodes(node: React.ReactNode): Element[] {
      if (Array.isArray(node)) return node.flatMap(nodes);
      if (!React.isValidElement<Record<string, unknown>>(node)) return [];
      if (typeof node.type === "function" && node.type.name === "PosterFrame") {
        return nodes((node.type as React.FunctionComponent<Record<string, unknown>>)(node.props) as React.ReactNode);
      }
      return [node, ...nodes(node.props.children as React.ReactNode)];
    }
    let step = 0;
    mocks.drive.mockImplementation((tree: React.ReactNode) => {
      const elements = nodes(tree);
      const viewers = elements.filter((node) => node.type === ImageViewer);
      expect(viewers).toHaveLength(1);
      const viewer = viewers[0];
      if (step++ === 0) {
        expect(viewer.props.open).toBe(false);
        const trigger = elements.find((node) => node.type === "button" && node.props["aria-label"] === `API 공연 ${label} 전체보기`)!;
        (trigger.props.onClick as () => void)();
      } else if (step === 2) {
        expect(viewer.props).toMatchObject({ open: true, imageUrl: url, alt: `API 공연 ${label}` });
        (viewer.props.onClose as () => void)();
      } else expect(viewer.props.open).toBe(false);
    });
    render({ imageGalleryUrls: ["/a.png", "/b.png", "/c.png"] });
    expect(step).toBe(3);
  });

  it.each([undefined, null, "", "   "])("has no image interaction for empty images (%s)", (imageMainUrl) => {
    const html = render({ imageMainUrl, imageGalleryUrls: [] });
    expect(html).toContain("등록된 포스터가 없습니다");
    expect(html).not.toContain("전체보기");
    expect(html).not.toContain("공연장 갤러리");
  });

  it("removes the full-view trigger when the poster fails to load", () => {
    let renders = 0;
    function visit(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
      if (Array.isArray(node)) return node.flatMap(visit);
      if (!React.isValidElement<Record<string, unknown>>(node)) return [];
      return [node, ...visit(node.props.children as React.ReactNode)];
    }
    mocks.drive.mockImplementation((tree: React.ReactNode) => {
      const poster = visit(tree).find((node) => typeof node.type === "function" && node.type.name === "PosterFrame")!;
      const frame = (poster.type as React.FunctionComponent<Record<string, unknown>>)(poster.props) as React.ReactNode;
      const nodes = visit(frame);
      if (renders++ === 0) {
        (nodes.find((node) => node.type === "img")!.props.onError as () => void)();
      } else {
        expect(nodes.some((node) => node.type === "button")).toBe(false);
        expect(nodes.some((node) => node.props.role === "img")).toBe(true);
      }
    });
    render();
    expect(renders).toBe(2);
  });
});

describe("booking opening uses server status and KST display (#356)", () => {
  it.each(["2026-09-22 19:00:00", "2026-09-22T19:00:00+09:00", "2026-09-22T10:00:00Z"])("displays the same opening for %s", (bookingOpenAt) => {
    expect(render({ status: "UPCOMING", bookingOpenAt })).toContain("2026년 09월 22일(화) 19:00");
  });
  it.each(["2026-09-22T09:59:00Z", "2026-09-22T10:00:00Z", "2030-01-01T00:00:00Z"])("does not let the client clock override server status (%s)", (now) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    try {
      for (const [status, label, disabled] of [["UPCOMING", "오픈 예정", true], ["ON_SALE", "예매하기", false], ["CLOSED", "예매 마감", true], ["CANCELED", "공연 취소", true]] as const) {
        const html = render({ status, bookingOpenAt: "2026-09-22 19:00:00" });
        const button = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].find((match) => match[2].includes(label));
        expect(button).toBeDefined();
        expect(button![1].includes("disabled")).toBe(disabled);
      }
    } finally { vi.useRealTimers(); }
  });
  it("uses the existing unknown-opening message for invalid input", () => {
    const html = render({ status: "UPCOMING", bookingOpenAt: "2026-02-30 19:00:00" });
    expect(html).toContain("티켓 오픈일이 곧 공개됩니다");
    expect(html).not.toContain("Invalid Date");
  });
});

describe("detail empty states (#322)", () => {
  it.each([undefined, null, "", "   "])("shows the poster empty state for %j", (imageMainUrl) => {
    const html = render({ imageMainUrl });
    expect(html).toContain("등록된 포스터가 없습니다");
    expect(html).toContain("from-poster-fallback");
    expectBody(html);
  });

  it("renders the poster image instead of the empty state when present", () => {
    const html = render();
    expect(html).toContain("/poster.png");
    expect(html).not.toContain("등록된 포스터가 없습니다");
  });

  it.each([undefined, null, "", "   "])("keeps the 공연 소개 section for %j", (description) => {
    const html = render({ description });
    expect(html).toContain("공연 소개");
    expect(html).toContain("등록된 공연 소개가 없습니다");
  });

  it("hides 편의시설 and 갤러리 when empty but keeps 공연 소개", () => {
    const html = render({ facilities: [], imageGalleryUrls: [] });
    expect(html).not.toContain("편의시설 및 서비스");
    expect(html).not.toContain("공연장 갤러리");
    expect(html).toContain("공연 소개");
  });

  it.each([undefined, null, "", "   "])("falls back to 미정 for a blank title (%j)", (title) => {
    const html = render({ title });
    expect(html).toContain("미정");
    expect(html).toContain("공연 포스터");
  });
});

describe("detail character API data", () => {
  it("forwards independent jazz colors and legacy fallback to the viewer", () => {
    const colors = { jazzShirtColor: "#FF0000", jazzInnerColor: "#00FF00", jazzPantsColor: "#0000FF" };
    render({ characterConfig: { ...config, outfitModelId: "rainbow-blouse", ...colors } });
    expect(mocks.viewer.mock.calls[0][0]).toMatchObject(colors);
    mocks.viewer.mockClear();
    const legacy = { ...config, outfitModelId: "rainbow-blouse", outfitColor: "#ABCDEF" } as Record<string, unknown>;
    for (const key of Object.keys(colors)) delete legacy[key];
    render({ characterConfig: legacy });
    expect(mocks.viewer.mock.calls[0][0]).toMatchObject({ jazzShirtColor: "#ABCDEF", jazzInnerColor: "#ABCDEF", jazzPantsColor: "#ABCDEF" });
  });

  it("renders the API character, all restored viewer settings and its message", () => {
    const html = render();
    expectBody(html);
    expect(html).toContain("공연 3D 캐릭터");
    expect(html).toContain("API 한마디");
    expect(html).not.toContain("함께 즐겨요");
    expect(mocks.viewer.mock.calls[0][0]).toMatchObject({
      ...restoreCharacterDraft(config), centered: true, modelScale: 0.9,
    });
  });
  it.each([undefined, null, "", "   "])("omits the speech bubble for %j", (characterMessage) => {
    const html = render({ characterMessage });
    expect(html).toContain("공연 3D 캐릭터");
    expect(html).not.toContain("max-w-[260px]");
    expectBody(html);
  });
  it.each([
    undefined, null, {}, [], "invalid", { schemaVersion: 99, ...{ outfitModelId: "theater" } },
    { ...config, schemaVersion: 99 }, { ...config, outfitModelId: "unknown" },
    { ...config, hairStyle: "unknown" }, { ...config, eyeStyle: "unknown" },
    { ...config, mouthStyle: "unknown" }, { ...config, skinColor: "invalid" },
    { ...config, fanmeetSkirtColor: [] }, { outfitModelId: "theater" },
  ])("hides absent or unrestorable config without affecting the detail (%j)", (characterConfig) => {
    const html = render({ characterConfig });
    expectBody(html);
    expect(html).not.toContain("공연 3D 캐릭터");
    expect(html).not.toContain("API 한마디");
    expect(mocks.viewer).not.toHaveBeenCalled();
  });
  it("supports valid legacy settings with the common part-color defaults", () => {
    const html = render({ characterConfig: { ...config, schemaVersion: undefined,
      fanmeetCardiganColor: undefined } });
    // Explicit malformed values are hidden; absent legacy fields use the shared fallback.
    expect(html).not.toContain("공연 3D 캐릭터");
    const legacy = { ...config } as Record<string, unknown>;
    delete legacy.schemaVersion;
    delete legacy.fanmeetCardiganColor;
    expect(render({ characterConfig: legacy })).toContain("공연 3D 캐릭터");
    expect(mocks.viewer.mock.calls[0][0].fanmeetCardiganColor).toBe("#FFF51C");
  });
  it("keeps the body and booking sidebar outside the failed character boundary", () => {
    // SSR does not catch render errors. Exercise the real boundary's post-error state.
    const originalRender = ErrorBoundary.prototype.render;
    vi.spyOn(ErrorBoundary.prototype, "render").mockImplementation(function (this: ErrorBoundary) {
      this.state = ErrorBoundary.getDerivedStateFromError(new Error("viewer failed"));
      return originalRender.call(this);
    });
    const html = render();
    expectBody(html);
    expect(html).not.toContain("공연 3D 캐릭터");
    expect(html).not.toContain("예상치 못한 오류");
    expect(mocks.viewer).not.toHaveBeenCalled();
  });
});
