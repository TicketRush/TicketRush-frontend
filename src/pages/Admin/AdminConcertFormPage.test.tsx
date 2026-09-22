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
  control: vi.fn(),
}));
vi.mock("react/jsx-dev-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-dev-runtime")>();
  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      const [type, props] = args;
      if (type !== "input" && type !== "select") return actual.jsxDEV(...args);
      return actual.jsxDEV(function CaptureControl() {
        hooks.control(props);
        return actual.jsxDEV(...args);
      }, {}, args[2], false);
    },
  };
});
vi.mock("@/hooks/admin/useAdmin", () => ({
  useConcertForEdit: hooks.query,
  useCreateConcert: () => ({ mutateAsync: hooks.create, isPending: false }),
  useUpdateConcert: () => ({ mutateAsync: hooks.update, isPending: false }),
}));
vi.mock("@/components/admin/character/CharacterModelViewer", () => ({
  default: (props: { fanmeetCardiganColor: string; jazzShirtColor: string; jazzInnerColor: string; jazzPantsColor: string }) => (
    <span>{props.fanmeetCardiganColor} {props.jazzShirtColor} {props.jazzInnerColor} {props.jazzPantsColor}</span>
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
  hooks.control.mockReset();
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
        <Route path="/admin/concerts/new" element={<AdminConcertFormPage mode="create" />} />
        <Route
          path="/admin/concerts/:id/edit"
          element={<AdminConcertFormPage mode="edit" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe.each(["create", "edit"])("show date Enter navigation (%s)", (mode) => {
  function setup(date: string) {
    const inputs: Array<{
      props: Record<string, unknown>;
      focus: ReturnType<typeof vi.fn>;
      scrollIntoView: ReturnType<typeof vi.fn>;
    }> = [];
    // Capture the actual rendered controls and handlers using the existing Node renderer.
    hooks.control.mockImplementation((props: Record<string, unknown>) => {
      inputs.push({ props, focus: vi.fn(), scrollIntoView: vi.fn() });
    });
    hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, date } }, isPending: false, isFetchedAfterMount: true });
    if (mode === "create") {
      render("/admin/concerts/new", { concertDraft: {
        pathname: "/admin/concerts/new", form: { ...initial.form, date }, totalSeats: 120,
      } });
    } else {
      render();
    }
    const querySelectorAll = vi.fn((selector: string) => {
      expect(selector).toBe("[data-form-focus='true']:not(:disabled)");
      return inputs.filter(({ props }) => props["data-form-focus"] === "true" && !props.disabled);
    });
    vi.stubGlobal("document", { querySelectorAll });
    const genre = inputs.find(({ props }) => props.value === "FANMEETING")!;
    const year = inputs.find(({ props }) => props.id === "show-date-year")!;
    const month = inputs.find(({ props }) => props.id === "show-date-month")!;
    const day = inputs.find(({ props }) => props.id === "show-date-day")!;
    const time = inputs.find(({ props }) => props.value === "19:30")!;
    function press(current: typeof year, key = "Enter") {
      const preventDefault = vi.fn();
      (current.props.onKeyDown as (event: unknown) => void)({ key, currentTarget: current, preventDefault });
      return preventDefault;
    }
    return { inputs, genre, year, month, day, time, press, querySelectorAll };
  }

  it.each(["", "2028--", "2028-02-", "2028-02-29"])("moves from genre to year (%s)", (date) => {
    const ui = setup(date);
    expect(ui.press(ui.genre)).toHaveBeenCalledOnce();
    expect(ui.year.focus).toHaveBeenCalledOnce();
  });

  it.each(["", "202--"])("skips disabled month and day (%s)", (date) => {
    const ui = setup(date);
    expect(ui.month.props.disabled).toBe(true);
    expect(ui.day.props.disabled).toBe(true);
    expect(ui.press(ui.year)).toHaveBeenCalledOnce();
    expect(ui.time.focus).toHaveBeenCalledOnce();
    expect(ui.month.focus).not.toHaveBeenCalled();
    expect(ui.day.focus).not.toHaveBeenCalled();
  });

  it("moves to enabled month and skips the still disabled day", () => {
    const ui = setup("2028--");
    expect(ui.press(ui.year)).toHaveBeenCalledOnce();
    expect(ui.month.focus).toHaveBeenCalledOnce();
    expect(ui.press(ui.month)).toHaveBeenCalledOnce();
    expect(ui.time.focus).toHaveBeenCalledOnce();
    expect(ui.day.focus).not.toHaveBeenCalled();
  });

  it.each(["2028-02-", "2028-02-29"])("moves year → month → day → time and prevents Enter's submit default (%s)", (date) => {
    const ui = setup(date);
    for (const [current, next] of [[ui.year, ui.month], [ui.month, ui.day], [ui.day, ui.time]]) {
      expect(ui.press(current)).toHaveBeenCalledOnce();
      expect(next.focus).toHaveBeenCalledOnce();
    }
    expect(hooks.create).not.toHaveBeenCalled();
    expect(hooks.update).not.toHaveBeenCalled();
  });

  it("leaves Tab to the browser and does not opt booking inputs into navigation", () => {
    const ui = setup("2028-02-29");
    for (const input of [ui.genre, ui.year, ui.month, ui.day]) {
      expect(ui.press(input, "Tab")).not.toHaveBeenCalled();
    }
    expect(ui.querySelectorAll).not.toHaveBeenCalled();
    for (const input of ui.inputs.filter(({ props }) => String(props.id).startsWith("booking-open-"))) {
      expect(input.props["data-form-focus"]).toBeUndefined();
      expect(input.props.onKeyDown).toBeUndefined();
    }
  });
});

describe("admin edit initial rendering", () => {
  it("restores booking and show date inputs independently in edit mode", () => {
    hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, bookingOpenAt: "2028-02-29T20:30:00" } }, isPending: false, isFetchedAfterMount: true });
    const html = render();
    expect(html).toContain('value="2028"');
    expect(html).toContain('value="02" selected=""');
    expect(html).toContain('value="29" selected=""');
    expect(html).toContain('value="20:30"');
    const showDate = html.match(/<fieldset aria-label="공연 날짜">(.*?)<\/fieldset>/)?.[1];
    expect(showDate).toContain('value="2027"');
    expect(showDate).toContain('value="01" selected=""');
    for (const part of ["year", "month", "day"]) expect(showDate).toContain(`id="show-date-${part}"`);
    expect(html).toContain("기존 예매 오픈 시각 해제는 지원하지 않습니다.");
    expect(hooks.update).not.toHaveBeenCalled();
  });

  it("restores a leap show date and preserves the separate show time", () => {
    hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, date: "2028-02-29", time: "19:30" } }, isPending: false, isFetchedAfterMount: true });
    const html = render();
    const showDate = html.match(/<fieldset aria-label="공연 날짜">(.*?)<\/fieldset>/)?.[1];
    expect(showDate).toContain('value="2028"');
    expect(showDate).toContain('value="02" selected=""');
    expect(showDate).toContain('value="29" selected=""');
    expect(html.match(/공연 시간.*?(<input\b[^>]*>)/)?.[1]).toContain('value="19:30"');
    expect(hooks.update).not.toHaveBeenCalled();
  });

  it("starts the create show date with month and day disabled", () => {
    hooks.query.mockReturnValue({});
    vi.stubGlobal("sessionStorage", { getItem: () => null });
    const html = render("/admin/concerts/new");
    for (const part of ["month", "day"]) {
      expect(html.match(new RegExp(`<select[^>]*id="show-date-${part}"[^>]*>`))?.[0]).toContain('disabled=""');
    }
  });

  it("restores independent jazz colors into the edit preview", () => {
    const characterConfig = createCharacterConfig(restoreCharacterDraft({ outfitModelId: "rainbow-blouse", jazzShirtColor: "#FF0000", jazzInnerColor: "#00FF00", jazzPantsColor: "#0000FF" })!);
    hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, characterConfig } }, isPending: false, isFetchedAfterMount: true });
    const html = render();
    for (const color of ["#FF0000", "#00FF00", "#0000FF"]) expect(html).toContain(color);
  });

  it("allows 100,000 seats in create mode with the matching input maximum", () => {
    hooks.query.mockReturnValue({});
    const html = render("/admin/concerts/new", {
      concertDraft: {
        pathname: "/admin/concerts/new",
        form: initial.form,
        totalSeats: 100_000,
      },
    });
    const input = html.match(/총 좌석 수.*?(<input\b[^>]*>)/)?.[1];
    expect(input).toBeDefined();
    expect(input).toContain('type="number"');
    expect(input).toContain('max="100000"');
    expect(input).toContain('value="100000"');
    expect(input).not.toContain("disabled");
    // Keep the existing browser defaults for min and step.
    expect(input).not.toMatch(/\s(?:min|step)=/);
  });

  it("keeps the total seat input disabled in edit mode", () => {
    const input = render().match(/총 좌석 수.*?(<input\b[^>]*>)/)?.[1];
    expect(input).toBeDefined();
    expect(input).toContain('disabled=""');
    expect(input).toContain('value="120"');
  });

  it.each([undefined, "2026-09-30T20:00"])("renders the shared optional booking input in create mode (%s)", (bookingOpenAt) => {
    hooks.query.mockReturnValue({});
    vi.stubGlobal("sessionStorage", { getItem: () => null });
    const state = bookingOpenAt ? {
      concertDraft: {
        pathname: "/admin/concerts/new",
        form: { ...initial.form, bookingOpenAt },
        totalSeats: 120,
      },
    } : undefined;
    const html = render("/admin/concerts/new", state);
    expect(html).toContain("예매 오픈 시각 (한국 시간)");
    expect(html).not.toContain('type="datetime-local"');
    for (const part of ["year", "month", "day", "time"]) expect(html).toContain(`id="booking-open-${part}"`);
    if (bookingOpenAt) {
      expect(html).toContain('value="2026"');
      expect(html).toContain('value="09" selected=""');
      expect(html).toContain('value="30" selected=""');
      expect(html).toContain('value="20:00"');
    }
    expect(html).not.toContain("기존 예매 오픈 시각 해제는 지원하지 않습니다.");
  });

  it("renders server values, image URLs and fanmeet colors instead of a creation draft", () => {
    const html = render();
    for (const value of [
      "서버 제목",
      "서버 한마디",
      "#ABCDEF",
      "/server-main.png",
      "/server-gallery.png",
      "/server.glb",
      'value="20:00"',
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
