import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminConcertFormPage from "./AdminConcertFormPage";
import ShowDateInput from "@/components/admin/ShowDateInput";
import DatePartsInput from "@/components/admin/DatePartsInput";
import BookingOpenAtInput from "@/components/admin/BookingOpenAtInput";
import { createPerformancePatch, createConcertReplacementFiles, mapConcertForEdit } from "@/api/adminConcertEdit";
import { createConcertFormData } from "@/api/adminConcertCreate";
import { toast } from "react-toastify";
import { ApiError } from "@/api/errors/errorMapper";
import {
  createCharacterConfig,
  restoreCharacterDraft,
} from "@/utils/character/characterConfig";

const hooks = vi.hoisted(() => ({
  query: vi.fn(),
  banners: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  control: vi.fn(),
  formRender: vi.fn(),
}));
vi.mock("react/jsx-dev-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react/jsx-dev-runtime")>();
  return {
    ...actual,
    jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
      const [type, props] = args;
      if (typeof type === "function" && type.name === "ConcertForm" && hooks.formRender.getMockImplementation()) {
        return actual.jsxDEV(function DriveForm() {
          // Run inside this React render so the real form's useState can rerender
          // after each input event, without mocking useState or its updater.
          const tree = (type as React.FunctionComponent)(props);
          hooks.formRender(tree);
          return tree;
        }, {}, args[2], false);
      }
      if (type !== "input" && type !== "select") return actual.jsxDEV(...args);
      return actual.jsxDEV(function CaptureControl() {
        hooks.control(props);
        return actual.jsxDEV(...args);
      }, {}, args[2], false);
    },
  };
});
vi.mock("@/hooks/queries/useBanners", () => ({ useBanners: hooks.banners }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
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
  hooks.banners.mockReturnValue({ data: [], isPending: false, isError: false });
  hooks.control.mockReset();
  hooks.formRender.mockReset();
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

it.each(["create", "edit"])("shows required date labels only in the performance schedule (%s)", (mode) => {
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  const html = render(mode === "create" ? "/admin/concerts/new" : undefined);
  expect(html).toContain("공연 일정");
  expect(html).not.toContain("일정 정보");
  expect(html).toContain("예매 일정");
  for (const [part, text] of [["year", "연도"], ["month", "월"], ["day", "일"]]) {
    const showLabel = html.match(new RegExp(`<label[^>]*for="show-date-${part}"[^>]*>([\\s\\S]*?)</label>`))?.[1];
    const bookingLabel = html.match(new RegExp(`<label[^>]*for="booking-open-${part}"[^>]*>([\\s\\S]*?)</label>`))?.[1];
    expect(showLabel).toContain(text);
    expect(showLabel).toMatch(/<span[^>]*aria-hidden="true"[^>]*>\*<\/span>/);
    expect(bookingLabel).toContain(text);
    expect(bookingLabel).not.toContain("*");
    for (const label of [showLabel!, bookingLabel!]) {
      expect(label).not.toMatch(/\s(?:required|aria-required)=/);
    }
  }
});

type FormElement = React.ReactElement<Record<string, unknown>>;
function formNodes(node: React.ReactNode): FormElement[] {
  if (Array.isArray(node)) return node.flatMap(formNodes);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  if (typeof node.type === "function" && node.type.name === "CaptureControl") {
    return formNodes((node.type as React.FunctionComponent<Record<string, unknown>>)(node.props));
  }
  return [node, ...formNodes(node.props.children as React.ReactNode)];
}

const bannerFullMessage = "배너 3개가 모두 등록되어 새로운 배너를 등록할 수 없습니다.";

describe("immediate booking", () => {
  it.each(["create", "edit"])("defaults to unchecked without inferring historical immediate booking (%s)", (mode) => {
    vi.stubGlobal("sessionStorage", { getItem: () => null });
    hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, bookingOpenAt: "2020-01-01 00:00:00" } }, isFetchedAfterMount: true });
    const html = render(mode === "create" ? "/admin/concerts/new" : undefined);
    expect(html).toContain("등록 즉시 예매 가능");
    expect(html.match(/<input[^>]*id="booking-immediate"[^>]*>/)?.[0]).not.toMatch(/checked|disabled/);
  });

  it.each(["create", "edit"])("submits immediate booking at save time and skips invalid draft validation (%s)", async (mode) => {
    let step = 0;
    let save: (() => Promise<void>) | undefined;
    hooks.formRender.mockImplementation((tree: React.ReactNode) => {
      const elements = formNodes(tree);
      const checkbox = elements.find((node) => node.props.id === "booking-immediate")!;
      const booking = elements.find((node) => node.type === BookingOpenAtInput)!;
      if (step++ === 0) {
        expect(checkbox.props.checked).toBe(false);
        (booking.props.onChange as (value: string) => void)("202--T25:00");
        (checkbox.props.onChange as (event: unknown) => void)({ target: { checked: true } });
        return;
      }
      expect(booking.props).toMatchObject({ disabled: true, value: "202--T25:00", "aria-describedby": "booking-schedule-note" });
      expect(booking.props["aria-invalid"]).toBeUndefined();
      expect(elements.some((node) => node.props.id === "booking-open-error")).toBe(false);
      save = elements.find((node) => node.type === "button" &&
        React.Children.toArray(node.props.children as React.ReactNode).includes(mode === "create" ? "공연 등록하기" : "변경사항 저장"))?.props.onClick as typeof save;
    });
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-25T14:59:00Z"));
      vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
      if (mode === "create") render("/admin/concerts/new", { concertDraft: {
        pathname: "/admin/concerts/new", form: { ...initial.form, bookingOpenAt: "" }, totalSeats: 120,
        mainImage: new File(["poster"], "poster.png", { type: "image/png" }),
      } });
      else render();
      vi.setSystemTime(new Date("2026-09-25T15:04:07Z"));
      await save!();
      const mutation = mode === "create" ? hooks.create : hooks.update;
      expect(mutation).toHaveBeenCalledOnce();
      expect(toast.error).not.toHaveBeenCalled();
      const input = mutation.mock.calls[0][0];
      const payload = mode === "create"
        ? JSON.parse(await (createConcertFormData(input).get("request") as Blob).text())
        : JSON.parse(JSON.stringify(createPerformancePatch(input)));
      expect(payload.booking_open_at).toBe("2026-09-26 00:04:07");
      expect(Object.keys(payload).filter((key) => /booking|immediate|status/.test(key))).toEqual(["booking_open_at"]);
    } finally { vi.useRealTimers(); }
  });

  it("restores draft seconds and no-change behavior after checking and unchecking", async () => {
    let step = 0;
    let save: (() => Promise<void>) | undefined;
    hooks.formRender.mockImplementation((tree: React.ReactNode) => {
      const elements = formNodes(tree);
      const checkbox = elements.find((node) => node.props.id === "booking-immediate")!;
      const booking = elements.find((node) => node.type === BookingOpenAtInput)!;
      expect(booking.props.value).toBe(initial.form.bookingOpenAt);
      expect(booking.props.disabled).toBe(step === 1);
      if (step < 2) {
        (checkbox.props.onChange as (event: unknown) => void)({ target: { checked: step++ === 0 } });
        return;
      }
      save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes("변경사항 저장"))?.props.onClick as typeof save;
    });
    render();
    await save!();
    expect(hooks.update).toHaveBeenCalledOnce();
    expect(JSON.parse(JSON.stringify(createPerformancePatch(hooks.update.mock.calls[0][0])))).toEqual({});
  });

  it.each(["ON_SALE", "CLOSED", "CANCELED"] as const)("locks booking while allowing other edits (%s)", async (status) => {
    let save: (() => Promise<void>) | undefined;
    let step = 0;
    hooks.query.mockReturnValue({ data: { ...initial, status }, isFetchedAfterMount: true });
    hooks.formRender.mockImplementation((tree: React.ReactNode) => {
      const elements = formNodes(tree);
      expect(elements.some((node) => node.props.id === "booking-immediate")).toBe(false);
      const booking = elements.find((node) => node.type === BookingOpenAtInput)!;
      expect(booking.props.disabled).toBe(true);
      if (step++ === 0) {
        // Even a stale draft must not block other edits or leak into the request.
        (booking.props.onChange as (value: string) => void)("invalid");
        const title = elements.find((node) => node.props.value === initial.form.title)!;
        (title.props.onChange as (value: string) => void)("제목 수정");
        return;
      }
      expect(booking.props["aria-invalid"]).toBeUndefined();
      save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes("변경사항 저장"))?.props.onClick as typeof save;
    });
    const html = render();
    expect(html).toContain(status === "CANCELED" ? "취소된 공연" : "예매 오픈됨");
    for (const part of ["year", "month", "day", "time"]) {
      expect(html.match(new RegExp(`<(?:input|select)[^>]*id="booking-open-${part}"[^>]*>`))?.[0]).toContain('disabled=""');
    }
    await save!();
    expect(hooks.update).toHaveBeenCalledOnce();
    expect(JSON.parse(JSON.stringify(createPerformancePatch(hooks.update.mock.calls[0][0])))).toEqual({ title: "제목 수정" });
  });
});

it.each([
  ["create", 0, false, false], ["create", 1, false, false],
  ["create", 2, false, false], ["create", 3, false, true], ["create", 4, false, true],
  ["edit", 3, false, true], ["edit", 3, true, false],
] as const)("applies banner capacity using the initial server state (%s, %i, %s)", (mode, count, enabled, disabled) => {
  hooks.banners.mockReturnValue({ data: Array.from({ length: count }, (_, performanceId) => ({ performanceId })) });
  hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, displayOnBanner: enabled, bannerSubtitle: enabled ? "재즈" : null } }, isFetchedAfterMount: true });
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  const html = render(mode === "create" ? "/admin/concerts/new" : undefined);
  const checkbox = html.match(/<input[^>]*id="banner-enabled"[^>]*>/)![0];
  expect(checkbox.includes('disabled=""')).toBe(disabled);
  expect(checkbox.includes('checked=""')).toBe(enabled);
  expect(html.includes('id="banner-subtitle"')).toBe(enabled);
  if (enabled) expect(html).toContain('value="재즈"');
  expect(html.includes(bannerFullMessage)).toBe(disabled);
  expect(checkbox).toContain('aria-describedby="banner-settings-note"');
  expect(html).toContain('id="banner-settings-note"');
  expect(hooks.update).not.toHaveBeenCalled();
});

it.each(["loading", "error"])("does not describe cached full data as current capacity while %s", (state) => {
  hooks.banners.mockReturnValue({ data: [{}, {}, {}], isPending: state === "loading", isError: state === "error" });
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  const html = render("/admin/concerts/new");
  expect(html).not.toContain(bannerFullMessage);
  expect(html).toContain(state === "loading" ? "배너 등록 상태를 확인하는 중입니다." : "배너 수를 확인하지 못했습니다.");
  expect(html.match(/<input[^>]*id="banner-enabled"[^>]*>/)?.[0]).toContain('disabled=""');
});

it.each(["full", "error"])("allows an existing banner to uncheck and recheck without a PATCH (%s)", async (state) => {
  hooks.banners.mockReturnValue(state === "full" ? { data: [{}, {}, {}] } : { isError: true });
  hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, displayOnBanner: true, bannerSubtitle: "재즈" } }, isFetchedAfterMount: true });
  let step = 0;
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = formNodes(tree);
    const checkbox = elements.find((node) => node.props.id === "banner-enabled")!;
    expect(checkbox.props.disabled).toBe(false);
    expect(checkbox.props.checked).toBe(step !== 1);
    expect(elements.find((node) => node.props.id === "banner-settings-note")?.props.children).not.toBe(bannerFullMessage);
    const subtitle = elements.find((node) => node.props.id === "banner-subtitle");
    if (step !== 1) expect(subtitle?.props.value).toBe("재즈");
    else expect(subtitle).toBeUndefined();
    if (step === 2) {
      save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes("변경사항 저장"))?.props.onClick as typeof save;
      return;
    }
    (checkbox.props.onChange as (event: unknown) => void)({ target: { checked: ++step === 2 } });
  });
  render();
  await save!();
  expect(step).toBe(2);
  expect(hooks.update).toHaveBeenCalledOnce();
  expect(JSON.stringify(createPerformancePatch(hooks.update.mock.calls[0][0]))).toBe("{}");
});

describe.each(["create", "edit"] as const)("new banner recovery (%s)", (mode) => {
  it.each(["full", "error", "loading"])("allows unchecking after the query changes to %s", async (state) => {
    type BannerQuery = { data?: object[]; isError?: boolean; isPending?: boolean };
    let changeQuery!: React.Dispatch<React.SetStateAction<BannerQuery>>;
    hooks.banners.mockImplementation(function useTestBanners() {
      const [query, setQuery] = React.useState<BannerQuery>({ data: [{}, {}] });
      changeQuery = setQuery;
      return query;
    });
    let step = 0;
    let save: (() => Promise<void>) | undefined;
    hooks.formRender.mockImplementation((tree: React.ReactNode) => {
      const elements = formNodes(tree);
      const checkbox = elements.find((node) => node.props.id === "banner-enabled")!;
      expect(checkbox.props.checked).toBe(step === 1 || step === 2);
      expect(checkbox.props.disabled).toBe(step === 3);
      expect(elements.find((node) => node.props.id === "banner-settings-note")?.props.children === bannerFullMessage).toBe(state === "full" && step === 3);
      const toggle = checkbox.props.onChange as (event: unknown) => void;
      if (step === 0) { step++; toggle({ target: { checked: true } }); }
      else if (step === 1) {
        step++;
        changeQuery(state === "full" ? { data: [{}, {}, {}] } : state === "error" ? { isError: true } : { isPending: true });
      } else if (step === 2) { step++; toggle({ target: { checked: false } }); }
      else {
        save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes(mode === "create" ? "공연 등록하기" : "변경사항 저장"))?.props.onClick as typeof save;
      }
    });
    vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
    const path = mode === "create" ? "/admin/concerts/new" : "/admin/concerts/42/edit";
    render(path, mode === "create" ? { concertDraft: { pathname: path, form: initial.form, totalSeats: 120, mainImage: new File(["poster"], "poster.png") } } : undefined);
    expect(step).toBe(3);
    await save!();
    const mutation = mode === "create" ? hooks.create : hooks.update;
    expect(mutation).toHaveBeenCalledOnce();
    const input = mutation.mock.calls[0][0];
    expect(input.form.displayOnBanner).toBe(false);
    if (mode === "create") {
      expect(JSON.parse(await (createConcertFormData(input).get("request") as Blob).text())).toMatchObject({ display_on_banner: false, banner_subtitle: null });
    } else {
      // The original was already false/null: recovery must not add a PATCH.
      expect(JSON.stringify(createPerformancePatch(input))).toBe("{}");
    }
  });
});

describe.each(["create-session", "create-return", "edit-return"])("selected draft recovery (%s)", (source) => {
  it.each(["full", "error", "loading"])("restores an enabled checkbox and allows unchecking with %s", (state) => {
    hooks.banners.mockReturnValue(state === "full" ? { data: [{}, {}, {}] } : state === "error" ? { isError: true } : { isPending: true });
    const path = source === "edit-return" ? "/admin/concerts/42/edit" : "/admin/concerts/new";
    const draft = { pathname: path, form: { ...initial.form, displayOnBanner: true, bannerSubtitle: "Draft subtitle" }, totalSeats: 120 };
    vi.stubGlobal("sessionStorage", { getItem: () => source === "create-session" ? JSON.stringify(draft) : null });
    let unchecked = false;
    hooks.formRender.mockImplementation((tree: React.ReactNode) => {
      const elements = formNodes(tree);
      const checkbox = elements.find((node) => node.props.id === "banner-enabled")!;
      expect(checkbox.props.checked).toBe(!unchecked);
      expect(checkbox.props.disabled).toBe(unchecked);
      if (!unchecked) {
        expect(elements.find((node) => node.props.id === "banner-subtitle")?.props.value).toBe("Draft subtitle");
        unchecked = true;
        (checkbox.props.onChange as (event: unknown) => void)({ target: { checked: false } });
      }
    });
    render(path, source === "create-session" ? undefined : { concertDraft: draft });
    expect(unchecked).toBe(true);
  });
});

it.each(["loading", "error"])("disables new banner selection while allowing ordinary creation (%s)", async (state) => {
  hooks.banners.mockReturnValue({ isPending: state === "loading", isError: state === "error" });
  vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = formNodes(tree);
    expect(elements.find((node) => node.props.id === "banner-enabled")?.props.disabled).toBe(true);
    const button = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes("공연 등록하기"))!;
    expect(button.props.disabled).toBe(false);
    save = button.props.onClick as typeof save;
  });
  render("/admin/concerts/new", { concertDraft: { pathname: "/admin/concerts/new", form: initial.form, totalSeats: 120, mainImage: new File(["poster"], "poster.png") } });
  await save!();
  expect(hooks.create).toHaveBeenCalledOnce();
  const request = JSON.parse(await (createConcertFormData(hooks.create.mock.calls[0][0]).get("request") as Blob).text());
  expect(request).toMatchObject({ display_on_banner: false, banner_subtitle: null });
});

it.each(["create", "edit"])("toasts the banner capacity conflict message without overriding it (%s)", async (mode) => {
  const message = "등록 가능한 배너 3개가 모두 사용 중입니다.";
  const mutation = mode === "create" ? hooks.create : hooks.update;
  mutation.mockRejectedValueOnce(new ApiError({ isSuccess: false, code: "BANNER_409_001", message, result: null }, 409));
  vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    save = formNodes(tree).find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes(mode === "create" ? "공연 등록하기" : "변경사항 저장"))?.props.onClick as typeof save;
  });
  render(mode === "create" ? "/admin/concerts/new" : undefined, mode === "create" ? { concertDraft: { pathname: "/admin/concerts/new", form: initial.form, totalSeats: 120, mainImage: new File(["poster"], "poster.png") } } : undefined);
  await save!();
  expect(mutation).toHaveBeenCalledOnce();
  expect(toast.error).toHaveBeenCalledWith(message);
});

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

it.each([["create", true], ["edit", true], ["create", false], ["edit", false]] as const)("persists banner settings and restores toggled text (%s, %s)", async (mode, enabled) => {
  type Element = React.ReactElement<Record<string, unknown>>;
  function nodes(node: React.ReactNode): Element[] {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!React.isValidElement<Record<string, unknown>>(node)) return [];
    if (typeof node.type === "function" && node.type.name === "CaptureControl") {
      return nodes((node.type as React.FunctionComponent<Record<string, unknown>>)(node.props));
    }
    return [node, ...nodes(node.props.children as React.ReactNode)];
  }
  let step = 0;
  let save: (() => Promise<void>) | undefined;
  const subtitle = "입력 중인 배너 문구";
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = nodes(tree);
    const checkbox = elements.find((element) => element.props.id === "banner-enabled")!;
    const input = elements.find((element) => element.props.id === "banner-subtitle");
    expect(checkbox.props.checked).toBe(step === 1 || step === 2 || step === 4);
    expect(Boolean(input)).toBe(step === 1 || step === 2 || step === 4);
    if (input) {
      expect(input.props.value).toBe(step === 1 ? "" : subtitle);
      expect(input.props.required).toBeUndefined();
      expect(input.props.maxLength).toBeUndefined();
    }
    expect(elements.find((element) => element.props.placeholder === "예: Neon Dreams Concert")?.props.value).toBe(initial.form.title);
    expect(elements.find((element) => element.type === "textarea")?.props.value).toBe(initial.form.description);
    if (step === (enabled ? 4 : 5)) {
      save = elements.find((element) => element.type === "button" &&
        React.Children.toArray(element.props.children as React.ReactNode).includes(mode === "create" ? "공연 등록하기" : "변경사항 저장"))?.props.onClick as typeof save;
      return;
    }
    const next = step++;
    if (next === 1) {
      (input!.props.onChange as React.ChangeEventHandler<HTMLInputElement>)({ target: { value: subtitle } } as React.ChangeEvent<HTMLInputElement>);
    } else {
      (checkbox.props.onChange as React.ChangeEventHandler<HTMLInputElement>)({ target: { checked: next !== 2 && next !== 4 } } as React.ChangeEvent<HTMLInputElement>);
    }
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 22));
  const mainImage = new File(["poster"], "poster.png", { type: "image/png" });
  try {
    vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(initial.form.characterConfig) });
    const path = mode === "create" ? "/admin/concerts/new" : "/admin/concerts/42/edit";
    render(path, mode === "create" ? { concertDraft: { pathname: path, form: initial.form, totalSeats: 120, mainImage } } : undefined);
    expect(step).toBe(enabled ? 4 : 5);
    expect(save).toBeTypeOf("function");
    await save!();
    const mutation = mode === "create" ? hooks.create : hooks.update;
    expect(mutation).toHaveBeenCalledOnce();
    const input = mutation.mock.calls[0][0];
    expect(input.form).toEqual({ ...initial.form, displayOnBanner: enabled, bannerSubtitle: subtitle });
    expect(Object.keys(input).sort()).toEqual((mode === "create"
      ? ["form", "totalSeats", "mainImage", "gallery", "immediateBooking"]
      : ["form", "original", "mainImage", "model3d", "gallery", "immediateBooking", "status"]).sort());
    expect(input.immediateBooking).toBe(false);

    if (mode === "create") {
      const data = createConcertFormData(input);
      expect(Array.from(data.keys())).toEqual(["request", "mainImage"]);
      expect(JSON.parse(await (data.get("request") as Blob).text())).toMatchObject({ display_on_banner: enabled, banner_subtitle: enabled ? subtitle : null });
    } else {
      expect(JSON.parse(JSON.stringify(createPerformancePatch(input)))).toEqual(enabled ? { display_on_banner: true, banner_subtitle: subtitle } : {});
    }
  } finally {
    vi.useRealTimers();
  }
});

it.each(["create", "edit"])("removes selected image files before saving (%s)", async (mode) => {
  type Element = React.ReactElement<Record<string, unknown>>;
  function nodes(node: React.ReactNode): Element[] {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!React.isValidElement<Record<string, unknown>>(node)) return [];
    return [node, ...nodes(node.props.children as React.ReactNode)];
  }
  const mainA = new File(["A"], "a.png", { type: "image/png" });
  const mainB = new File(["B"], "b.png", { type: "image/png" });
  const gallery = ["A", "B", "C"].map((value) => new File([value], "same.png", { type: "image/png" }));
  let step = 0;
  let saveEmpty: (() => Promise<void>) | undefined;
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = nodes(tree);
    const upload = elements.filter((node) => typeof node.type === "function" && node.type.name === "UploadBox" && node.props.accept === "image/*");
    const selected = elements.filter((node) => typeof node.type === "function" && node.type.name === "SelectedImage");
    const submit = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes(mode === "create" ? "공연 등록하기" : "변경사항 저장"))?.props.onClick as () => Promise<void>;
    const choose = (index: number, files: File[]) => (upload[index].props.onFilesSelected as (files: File[]) => void)(files);
    switch (step++) {
      case 0: choose(0, [mainA]); break;
      case 1:
        expect(selected.map((node) => node.props.file)).toEqual([mainA]);
        (selected[0].props.onRemove as () => void)(); break;
      case 2:
        expect(selected).toHaveLength(0);
        saveEmpty = submit;
        choose(0, [mainA]); break;
      case 3: choose(0, [mainB]); break;
      case 4: choose(1, gallery); break;
      case 5:
        expect(selected.map((node) => node.props.file)).toEqual([mainB, ...gallery]);
        (selected[2].props.onRemove as () => void)(); break;
      default:
        expect(selected.map((node) => node.props.file)).toEqual([mainB, gallery[0], gallery[2]]);
        save = submit;
    }
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 22));
  try {
    if (mode === "create") {
      hooks.query.mockReturnValue({});
      vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
      const html = render("/admin/concerts/new", { concertDraft: { pathname: "/admin/concerts/new", form: initial.form, totalSeats: 120 } });
      expect(html).toContain('type="button" aria-label="대표 이미지 삭제"');
      expect(html).toContain('type="button" aria-label="갤러리 이미지 1 삭제"');
      await saveEmpty!();
      expect(hooks.create).not.toHaveBeenCalled();
    } else {
      hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, imageGalleryUrls: [] } }, isFetchedAfterMount: true });
      render();
    }
    expect(save).toBeTypeOf("function");
    await save!();
    const mutation = mode === "create" ? hooks.create : hooks.update;
    expect(mutation).toHaveBeenCalledOnce();
    const input = mutation.mock.calls[0][0];
    expect(input.mainImage).toBe(mainB);
    expect(input.gallery).toEqual([gallery[0], gallery[2]]);
    const data = mode === "create" ? createConcertFormData(input) : createConcertReplacementFiles(input)!;
    expect(data.get("mainImage")).toBe(mainB);
    expect(data.getAll("gallery")).toEqual([gallery[0], gallery[2]]);
  } finally { vi.useRealTimers(); }
});

it.each([false, true])("removes server gallery images and saves the remaining mixed gallery (clear=%s)", async (clear) => {
  const urls = ["/g1.png", "/g2.png", "/g3.png"];
  const files = [new File(["n1"], "n1.png"), new File(["n2"], "n2.png")];
  hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, imageGalleryUrls: urls } }, isFetchedAfterMount: true });
  let step = 0;
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = formNodes(tree);
    const serverImages = elements.filter((node) => node.type === "img" && urls.includes(node.props.src as string));
    const remove = elements.filter((node) => node.type === "button" && String(node.props["aria-label"]).startsWith("기존 갤러리 이미지"));
    const selected = elements.filter((node) => typeof node.type === "function" && node.type.name === "SelectedImage");
    const upload = elements.filter((node) => typeof node.type === "function" && node.type.name === "UploadBox" && node.props.accept === "image/*");
    if (step === 0) {
      expect(serverImages.map((node) => node.props.src)).toEqual(urls);
      expect(selected).toHaveLength(0);
      for (const button of remove) expect(button.props.type).toBe("button");
    }
    if (clear && remove.length) {
      step++;
      (remove[0].props.onClick as () => void)();
      return;
    }
    if (!clear) {
      switch (step++) {
        case 0: (remove[1].props.onClick as () => void)(); return;
        case 1:
          expect(serverImages.map((node) => node.props.src)).toEqual([urls[0], urls[2]]);
          (upload[1].props.onFilesSelected as (files: File[]) => void)(files); return;
        case 2:
          expect(selected.map((node) => node.props.file)).toEqual([files[0]]);
          (selected[0].props.onRemove as () => void)(); return;
        case 3:
          expect(selected).toHaveLength(0);
          (upload[1].props.onFilesSelected as (files: File[]) => void)([files[1]]); return;
      }
    }
    expect(serverImages.map((node) => node.props.src)).toEqual(clear ? [] : [urls[0], urls[2]]);
    expect(selected.map((node) => node.props.file)).toEqual(clear ? [] : [files[1]]);
    save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes("변경사항 저장"))?.props.onClick as typeof save;
  });
  render();
  await save!();
  expect(hooks.update).toHaveBeenCalledOnce();
  const input = hooks.update.mock.calls[0][0];
  expect(JSON.parse(JSON.stringify(createPerformancePatch(input)))).toEqual({});
  const data = createConcertReplacementFiles(input)!;
  expect(JSON.parse(await (data.get("request") as Blob).text())).toEqual({ keep_gallery_urls: clear ? [] : [urls[0], urls[2]] });
  expect(data.getAll("gallery")).toEqual(clear ? [] : [files[1]]);
});

it("canceling new images restores the existing main image and no-change file policy", async () => {
  const file = new File(["new"], "new.png");
  let step = 0;
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = formNodes(tree);
    const selected = elements.filter((node) => typeof node.type === "function" && node.type.name === "SelectedImage");
    const upload = elements.filter((node) => typeof node.type === "function" && node.type.name === "UploadBox" && node.props.accept === "image/*");
    expect(elements.some((node) => node.type === "img" && node.props.src === initial.form.imageMainUrl)).toBe(step !== 1);
    if (step++ === 0) {
      for (const node of upload) (node.props.onFilesSelected as (files: File[]) => void)([file]);
      return;
    }
    if (step === 2) {
      expect(selected).toHaveLength(2);
      for (const node of selected) (node.props.onRemove as () => void)();
      return;
    }
    expect(selected).toHaveLength(0);
    save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes("변경사항 저장"))?.props.onClick as typeof save;
  });
  render();
  await save!();
  expect(hooks.update).toHaveBeenCalledOnce();
  expect(createConcertReplacementFiles(hooks.update.mock.calls[0][0])).toBeNull();
});

it.each([
  ["create", 0, 2, 1, 3, false],
  ["create", 0, 3, 1, 3, true],
  ["create", 0, 2, 2, 3, true],
  ["edit", 3, 0, 1, 0, true],
  ["edit", 2, 0, 1, 1, false],
  ["edit", 2, 0, 2, 1, true],
  ["edit", 2, 1, 1, 1, true],
] as const)("limits gallery independently of the main image (%s, existing=%i, selected=%i, added=%i)", async (mode, existingCount, selectedCount, addedCount, expectedCount, overflow) => {
  const urls = Array.from({ length: existingCount }, (_, i) => `/g${i}.png`);
  const selectedFiles = Array.from({ length: selectedCount }, (_, i) => new File(["old"], `selected${i}.png`));
  const added = Array.from({ length: addedCount }, (_, i) => new File(["new"], `added${i}.png`));
  const mainImage = new File(["main"], "main.png");
  const form = { ...initial.form, imageGalleryUrls: urls };
  hooks.query.mockReturnValue({ data: { ...initial, form }, isFetchedAfterMount: true });
  let step = 0;
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = formNodes(tree);
    if (step++ === 0) {
      const upload = elements.find((node) => typeof node.type === "function" && node.type.name === "UploadBox" && node.props.multiple)!;
      (upload.props.onFilesSelected as (files: File[]) => void)(added);
      return;
    }
    const previews = elements.filter((node) => typeof node.type === "function" && node.type.name === "SelectedImage");
    expect(previews.map((node) => node.props.file)).toEqual([mainImage, ...[...selectedFiles, ...added].slice(0, expectedCount)]);
    save = elements.find((node) => node.type === "button" && React.Children.toArray(node.props.children as React.ReactNode).includes(mode === "create" ? "공연 등록하기" : "변경사항 저장"))?.props.onClick as typeof save;
  });
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2026-09-25T03:00:00Z"));
    vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
    const path = mode === "create" ? "/admin/concerts/new" : "/admin/concerts/42/edit";
    render(path, { concertDraft: { pathname: path, form, totalSeats: 120, mainImage, galleryImages: selectedFiles } });
    if (overflow) expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("서브 이미지는 최대 3장"));
    else expect(toast.error).not.toHaveBeenCalled();
    await save!();
    const mutation = mode === "create" ? hooks.create : hooks.update;
    expect(mutation).toHaveBeenCalledOnce();
    const input = mutation.mock.calls[0][0];
    const data = mode === "create" ? createConcertFormData(input) : createConcertReplacementFiles(input)!;
    expect(data.get("mainImage")).toBe(mainImage);
    expect(data.getAll("gallery")).toEqual([...selectedFiles, ...added].slice(0, expectedCount));
    expect(existingCount + data.getAll("gallery").length).toBeLessThanOrEqual(3);
  } finally { vi.useRealTimers(); }
});

it.each(["create", "edit"])("validates schedule inputs only after interaction and clears accessible errors (%s)", (mode) => {
  type Element = React.ReactElement<Record<string, unknown>>;
  function nodes(node: React.ReactNode): Element[] {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!React.isValidElement<Record<string, unknown>>(node)) return [];
    if (node.type === ShowDateInput || node.type === DatePartsInput || node.type === BookingOpenAtInput ||
        (typeof node.type === "function" && ["EditableTimeInput", "CaptureControl"].includes(node.type.name))) {
      return nodes((node.type as React.FunctionComponent<Record<string, unknown>>)(node.props));
    }
    return [node, ...nodes(node.props.children as React.ReactNode)];
  }
  const steps = [
    ...(mode === "edit" ? [["show-date-day", "", "show-date-error"]] : []),
    ["show-date-year", "0999", "show-date-error"],
    ["show-date-year", "2028", "show-date-error"],
    ["show-date-month", "02", "show-date-error"],
    ["show-date-day", "29", ""],
    ["show-date-year", "202", "show-date-error"],
    ["show-date-year", "2027", "show-date-error"],
    ["show-date-day", "28", ""],
    ["show-time", "25:00", "show-time-error"],
    ["show-time", "12:70", "show-time-error"],
    ["show-time", "", "show-time-error"],
    ["show-time", "19:30", ""],
    ...(mode === "edit" ? [["booking-open-day", "", "booking-open-error"]] : []),
    ["booking-open-year", "202", "booking-open-error"],
    ["booking-open-year", "2028", "booking-open-error"],
    ["booking-open-month", "02", "booking-open-error"],
    ["booking-open-day", "29", mode === "create" ? "booking-open-error" : ""],
    ["booking-open-time", "20:30", ""],
    ["booking-open-time", "25:00", "booking-open-error"],
    ["booking-open-time", "1900", ""],
    ["booking-open-time", "", "booking-open-error"],
    ["booking-open-time", "21:00", ""],
    ...(mode === "create" ? [
      ["booking-open-day", "", "booking-open-error"],
      ["booking-open-month", "", "booking-open-error"],
      ["booking-open-year", "", "booking-open-error"],
      ["booking-open-time", "", ""],
    ] : []),
  ];
  let step = 0;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = nodes(tree);
    const errors = elements.filter((element) => ["show-date-error", "show-time-error", "booking-open-error"].includes(String(element.props.id)));
    const expected = step ? steps[step - 1][2] : "";
    expect(errors.map((element) => element.props.id)).toEqual(expected ? [expected] : []);
    for (const element of elements.filter((element) => element.type === "input" || element.type === "select")) {
      const id = String(element.props.id ?? "");
      const group = id.startsWith("show-date-") ? "show-date-error" : id.startsWith("booking-open-") ? "booking-open-error"
        : element.props.placeholder === "예: 19:00" ? "show-time-error" : null;
      if (!group) continue;
      expect(element.props["aria-invalid"]).toBe(expected === group ? true : undefined);
      expect(element.props["aria-describedby"]).toBe(expected === group ? group : undefined);
      if (expected === group) expect(elements.indexOf(errors[0])).toBeLessThan(elements.indexOf(element));
    }
    if (step === steps.length) return;
    const [id, value] = steps[step++];
    const control = elements.find((element) => id === "show-time"
      ? element.type === "input" && element.props.placeholder === "예: 19:00" : element.props.id === id)!;
    expect(control.props.disabled).not.toBe(true);
    (control.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 22));
  try {
    if (mode === "create") {
      hooks.query.mockReturnValue({});
      vi.stubGlobal("sessionStorage", { getItem: () => null });
      render("/admin/concerts/new");
    } else {
      // Preserve a valid, untouched edit value while date partial states are tested.
      hooks.query.mockReturnValue({ data: { ...initial, form: { ...initial.form, date: "2028-02-29", bookingOpenAt: "2028-02-29T20:00:45" } }, isPending: false, isFetchedAfterMount: true });
      render();
    }
    expect(step).toBe(steps.length);
    expect(hooks.create).not.toHaveBeenCalled();
    expect(hooks.update).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});

it("saves the parent form date after selecting year, month and day on the create page", async () => {
  type Element = React.ReactElement<Record<string, unknown>>;
  function nodes(node: React.ReactNode): Element[] {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!React.isValidElement<Record<string, unknown>>(node)) return [];
    if (node.type === ShowDateInput || node.type === DatePartsInput ||
        (typeof node.type === "function" && node.type.name === "CaptureControl")) {
      return nodes((node.type as React.FunctionComponent<Record<string, unknown>>)(node.props) as React.ReactNode);
    }
    return [node, ...nodes(node.props.children as React.ReactNode)];
  }
  const selections = [["year", "2028"], ["month", "02"], ["day", "29"]];
  let step = 0;
  let save: (() => Promise<void>) | undefined;
  hooks.formRender.mockImplementation((tree: React.ReactNode) => {
    const elements = nodes(tree);
    if (step < selections.length) {
      const [part, value] = selections[step++];
      const control = elements.find((element) => element.props.id === `show-date-${part}`)!;
      expect(control.props.disabled).not.toBe(true);
      (control.props.onChange as React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>)({
        target: { value },
      } as React.ChangeEvent<HTMLInputElement>);
      return;
    }
    for (const [part, value] of selections) {
      expect(elements.find((element) => element.props.id === `show-date-${part}`)?.props.value).toBe(value);
    }
    save = elements.find((element) => element.type === "button" &&
      React.Children.toArray(element.props.children as React.ReactNode).includes("공연 등록하기"))?.props.onClick as typeof save;
  });
  // Keep the existing date scheduling policy deterministic.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 22));
  try {
    hooks.query.mockReturnValue({});
    vi.stubGlobal("sessionStorage", { getItem: () => null, removeItem: vi.fn() });
    render("/admin/concerts/new", { concertDraft: {
      pathname: "/admin/concerts/new",
      form: { ...initial.form, date: "" },
      totalSeats: 120,
      mainImage: new File(["poster"], "poster.png", { type: "image/png" }),
    } });
    expect(step).toBe(3);
    expect(save).toBeTypeOf("function");
    await save!();
    expect(hooks.create).toHaveBeenCalledOnce();
    expect(hooks.create.mock.calls[0][0].form).toEqual(expect.objectContaining({
      date: "2028-02-29",
      time: "19:30",
      bookingOpenAt: initial.form.bookingOpenAt,
    }));
  } finally {
    vi.useRealTimers();
  }
});

describe.each(["create", "edit"])("show date Enter navigation (%s)", (mode) => {
  function setup(date: string, immediateBooking = false) {
    if (immediateBooking) hooks.formRender.mockImplementation((tree: React.ReactNode) => {
      const checkbox = formNodes(tree).find((node) => node.props.id === "booking-immediate")!;
      if (!checkbox.props.checked) (checkbox.props.onChange as (event: unknown) => void)({ target: { checked: true } });
    });
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

  it("preserves Enter navigation with all immediate booking inputs disabled", () => {
    const ui = setup("2028-02-29", true);
    const bookingInputs = ui.inputs.filter(({ props }) => String(props.id).startsWith("booking-open-"));
    expect(bookingInputs).toHaveLength(4);
    for (const input of bookingInputs) {
      expect(input.props.disabled).toBe(true);
      expect(input.props["data-form-focus"]).toBeUndefined();
    }
    const duration = ui.inputs.find(({ props }) => props.placeholder === "예: 120")!;
    const next = ui.inputs.find(({ props }) => props.placeholder === (mode === "create" ? "예: Main Concert Hall" : "예: 서울특별시 송파구 ..."))!;
    expect(ui.press(duration)).toHaveBeenCalledOnce();
    expect(next.focus).toHaveBeenCalledOnce();
    for (const input of bookingInputs) expect(input.focus).not.toHaveBeenCalled();
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
