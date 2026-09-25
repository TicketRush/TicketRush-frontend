import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminConcertFormPage from "./AdminConcertFormPage";
import ShowDateInput from "@/components/admin/ShowDateInput";
import DatePartsInput from "@/components/admin/DatePartsInput";
import BookingOpenAtInput from "@/components/admin/BookingOpenAtInput";
import { createPerformancePatch, mapConcertForEdit } from "@/api/adminConcertEdit";
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

it.each([
  ["create", 2, false, false], ["create", 3, false, true],
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
  expect(html).toContain("최대 3개");
  expect(hooks.update).not.toHaveBeenCalled();
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

it.each(["create", "edit"])("toasts a server conflict message without overriding it (%s)", async (mode) => {
  // Synthetic fixture only: the backend's final conflict code/message is pending.
  const message = "서버에서 전달한 충돌 안내";
  const mutation = mode === "create" ? hooks.create : hooks.update;
  mutation.mockRejectedValueOnce(new ApiError({ isSuccess: false, code: "TEST_CONFLICT", message, result: null }, 409));
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
      ? ["form", "totalSeats", "mainImage", "gallery"]
      : ["form", "original", "mainImage", "model3d", "gallery"]).sort());

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
