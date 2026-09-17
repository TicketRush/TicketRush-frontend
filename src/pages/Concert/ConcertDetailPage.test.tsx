import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConcertDetailPage from "./ConcertDetailPage";
import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
import type { ConcertDetail } from "@/types/domain/concert";
import { createCharacterConfig, restoreCharacterDraft } from "@/utils/character/characterConfig";

const mocks = vi.hoisted(() => ({ detail: vi.fn(), viewer: vi.fn() }));
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
  vi.stubGlobal("React", React);
  mocks.viewer.mockReset().mockReturnValue(<span>viewer</span>);
  mocks.detail.mockReturnValue({ data: concert, isLoading: false, isError: false });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function render(overrides: Record<string, unknown> = {}) {
  mocks.detail.mockReturnValue({ data: { ...concert, ...overrides }, isLoading: false, isError: false });
  return renderToStaticMarkup(<MemoryRouter initialEntries={["/concerts/42"]}>
    <Routes><Route path="/concerts/:id" element={<ConcertDetailPage />} /></Routes>
  </MemoryRouter>);
}

function expectBody(html: string) {
  for (const value of ["API 공연", "API 출연진", "2027-01-01", "10,000", "API 소개", "/gallery.png", "예매"]) {
    expect(html).toContain(value);
  }
}

describe("detail character API data", () => {
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
