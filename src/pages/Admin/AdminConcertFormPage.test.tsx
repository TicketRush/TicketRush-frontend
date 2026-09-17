import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminConcertFormPage from "./AdminConcertFormPage";
import { mapConcertForEdit } from "@/api/adminConcertEdit";
import {
  createCharacterConfig,
  restoreCharacterDraft,
} from "@/utils/character/characterConfig";

const hooks = vi.hoisted(() => ({
  query: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/hooks/admin/useAdmin", () => ({
  useConcertForEdit: hooks.query,
  useCreateConcert: () => ({ mutateAsync: hooks.create, isPending: false }),
  useUpdateConcert: () => ({ mutateAsync: hooks.update, isPending: false }),
}));
vi.mock("@/components/admin/character/CharacterModelViewer", () => ({
  default: (props: { fanmeetCardiganColor: string }) => (
    <span>{props.fanmeetCardiganColor}</span>
  ),
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

const initial = mapConcertForEdit({
  id: 42,
  title: "서버 제목",
  performer: "서버 출연진",
  genre: "FANMEETING",
  address: "서울",
  showDate: "2027-01-01",
  showTime: "19:30",
  price: 10000,
  durationMinutes: 90,
  totalSeats: 120,
  description: "서버 설명",
  status: "UPCOMING",
  imageMainUrl: "/server-main.png",
  imageGalleryUrls: ["/server-gallery.png"],
  image3dUrl: "/server.glb",
  facilities: [],
  bookingOpenAt: "2026-12-01T20:00:00",
  characterMessage: "서버 한마디",
  characterConfig: createCharacterConfig(
    restoreCharacterDraft({
      outfitModelId: "theater",
      fanmeetCardiganColor: "#ABCDEF",
    })!,
  ),
});
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  // An unrelated creation draft must never override the server's edit data.
  vi.stubGlobal("sessionStorage", {
    getItem: () => JSON.stringify({ form: { title: "다른 공연 초안" } }),
  });
  vi.stubGlobal("localStorage", {
    getItem: () => JSON.stringify({ outfitModelId: "concert" }),
  });
  hooks.query.mockReturnValue({
    data: initial,
    isPending: false,
    isFetchedAfterMount: true,
  });
});
afterEach(() => vi.unstubAllGlobals());

function render(path = "/admin/concerts/42/edit", state?: unknown) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route
          path="/admin/concerts/:id/edit"
          element={<AdminConcertFormPage mode="edit" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("admin edit initial rendering", () => {
  it("renders server values, image URLs and fanmeet colors instead of a creation draft", () => {
    const html = render();
    for (const value of [
      "서버 제목",
      "서버 한마디",
      "#ABCDEF",
      "/server-main.png",
      "/server-gallery.png",
      "/server.glb",
      "2026-12-01T20:00:00",
    ]) {
      expect(html).toContain(value);
    }
    expect(html).not.toContain("다른 공연 초안");
    expect(hooks.query).toHaveBeenCalledWith(42);
    expect(hooks.update).not.toHaveBeenCalled();
  });
  it("does not render a blank editable form while loading", () => {
    hooks.query.mockReturnValue({ isPending: true });
    const html = render();
    expect(html).toContain("불러오는 중");
    expect(html).not.toContain("변경사항 저장");
  });
  it("shows fetch errors without exposing an empty save form", () => {
    hooks.query.mockReturnValue({
      isPending: false,
      error: new Error("조회 실패"),
    });
    expect(render()).toContain("조회 실패");
    expect(render()).not.toContain("변경사항 저장");
  });
  it("renders legacy performances without character data", () => {
    hooks.query.mockReturnValue({
      data: {
        ...initial,
        form: {
          ...initial.form,
          characterConfig: undefined,
          characterMessage: "",
        },
      },
      isPending: false,
      isFetchedAfterMount: true,
    });
    expect(render()).toContain("변경사항 저장");
    expect(render()).not.toContain("#ABCDEF");
  });
  it("restores an edit draft and new character only for the matching return path", () => {
    const state = {
      concertDraft: {
        pathname: "/admin/concerts/42/edit",
        form: { ...initial.form, title: "수정 중 제목" },
        totalSeats: 120,
      },
      characterConfig: {
        ...initial.form.characterConfig!,
        fanmeetCardiganColor: "#123456",
      },
    };
    expect(render(undefined, state)).toContain("수정 중 제목");
    expect(render(undefined, state)).toContain("#123456");
    expect(render("/admin/concerts/43/edit", state)).not.toContain(
      "수정 중 제목",
    );
    expect(render("/admin/concerts/43/edit", state)).not.toContain("#123456");
  });
});
