import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminBannersPage from "./AdminBannersPage";
import type { BannerItem } from "@/types/domain/banner";
import { toast } from "react-toastify";
import Pagination from "@/components/admin/Pagination";

const mocks = vi.hoisted(() => ({ query: vi.fn(), control: vi.fn(), row: vi.fn(), page: vi.fn(), concerts: vi.fn(), mutation: vi.fn(), save: vi.fn() }));
vi.mock("@/hooks/admin/useAdmin", () => ({ useAdminConcerts: mocks.concerts }));
vi.mock("@/hooks/admin/useAdminBanners", () => ({ useUpdateConcertBanner: mocks.mutation }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/queries/useBanners", () => ({ useBanners: mocks.query }));
vi.mock("@/hooks/common/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("react/jsx-dev-runtime", async (original) => {
  const actual = await original<typeof import("react/jsx-dev-runtime")>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    const [type, props] = args;
    if (typeof type === "function" && type.name === "BannerRow") {
      return actual.jsxDEV(function DriveRow() {
        const tree = (type as React.FunctionComponent)(props);
        mocks.row(tree);
        return tree;
      }, {}, args[2], false);
    }
    if (args[0] !== "button") return actual.jsxDEV(...args);
    return actual.jsxDEV(function Capture() {
      mocks.control(args[1]);
      return actual.jsxDEV(...args);
    }, {}, args[2], false);
  } };
});
const banners: BannerItem[] = [
  { performanceId: 60, title: "Jazz", subtitle: "Evening jazz", date: "2027-01-01", imageUrl: "/jazz.png", order: 2 },
  { performanceId: 91, title: "Concert", subtitle: null, date: "2027-02-01", imageUrl: null, order: 5 },
];
function DrivePage() {
  const tree = AdminBannersPage();
  mocks.page(tree);
  return tree;
}
function render() { return renderToStaticMarkup(<MemoryRouter><DrivePage /></MemoryRouter>); }
beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.control.mockReset();
  mocks.row.mockReset();
  mocks.page.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  mocks.save.mockReset().mockResolvedValue(undefined);
  mocks.mutation.mockReturnValue({ mutateAsync: mocks.save, isPending: false });
  mocks.concerts.mockReturnValue({ data: { items: [], pagination: { totalPages: 1 } }, isPending: false });
  mocks.query.mockReturnValue({ data: banners, isPending: false, isError: false, refetch: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

it("renders banner details, server order and existing edit links using performance IDs", () => {
  const html = render();
  for (const text of ["배너 관리", "현재 배너 2 / 3", "Jazz", "Concert", "Evening jazz", "2027-01-01", "2027-02-01", "순서 2", "순서 5"]) expect(html).toContain(text);
  expect(html).toContain('src="/jazz.png"');
  expect(html).toContain('alt="Jazz 대표 이미지"');
  expect(html).toContain('href="/admin/concerts/60/edit"');
  expect(html).toContain('href="/admin/concerts/91/edit"');
  expect(html).toContain('aria-label="Jazz 공연 수정"');
  expect(html).not.toContain("null");
  expect(html.match(/<li /g)).toHaveLength(2);
  expect(html.indexOf("Jazz</h2>")).toBeLessThan(html.indexOf("Concert</h2>"));
});
it("shows an empty message and zero count", () => {
  mocks.query.mockReturnValue({ data: [], isPending: false });
  const html = render();
  expect(html).toContain("현재 배너 0 / 3");
  expect(html).toContain("현재 등록된 배너가 없습니다.");
  expect(html).not.toContain("<li");
});

function candidates() {
  mocks.concerts.mockReturnValue({ data: { items: [
    { id: 60, title: "Jazz", date: "2027-01-01", status: "ON_SALE" },
    { id: 42, title: "New concert", date: "2027-02-01", status: "UPCOMING" },
    { id: 43, title: "Closed concert", date: "2020-02-01", status: "CLOSED" },
  ], pagination: { totalPages: 1 } }, isPending: false, isFetching: false });
}
function control(label: string) {
  return mocks.control.mock.calls.map(([props]) => props).find(props => props["aria-label"] === label);
}

it("excludes existing banners from candidates without imposing a status filter", () => {
  candidates();
  const html = render();
  expect(control("Jazz 배너 추가")).toBeUndefined();
  expect(control("New concert 배너 추가").disabled).toBe(false);
  expect(control("Closed concert 배너 추가").disabled).toBe(false);
  expect(html).toContain("추가");
  expect(mocks.concerts).toHaveBeenLastCalledWith({ page: 0, size: 10 }, { refetchOnMount: "always" });
});

it.each([true, false])("changes only the selected banner flag (%s) and renders refreshed server results", async enabled => {
  candidates();
  render();
  const label = enabled ? "New concert 배너 추가" : "Jazz 배너에서 제거";
  control(label).onClick();
  await vi.waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ id: enabled ? 42 : 60, displayOnBanner: enabled });
  mocks.query.mockReturnValue({ data: enabled ? [...banners, { performanceId: 42, title: "New concert", order: 3 }] : [banners[1]] });
  mocks.control.mockClear();
  const html = render();
  if (enabled) {
    expect(control("New concert 배너 추가")).toBeUndefined();
    expect(control("New concert 배너에서 제거")).toBeDefined();
    expect(html).toContain("현재 배너 3 / 3");
  } else {
    expect(control("Jazz 배너에서 제거")).toBeUndefined();
    expect(control("Jazz 배너 추가")).toBeDefined();
  }
});

it.each([true, false])("keeps server UI and reports a failed change (%s)", async enabled => {
  candidates();
  mocks.save.mockRejectedValue(new Error("서버 배너 변경 실패"));
  const before = render();
  control(enabled ? "New concert 배너 추가" : "Jazz 배너에서 제거").onClick();
  await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("서버 배너 변경 실패"));
  expect(render()).toBe(before);
  expect(toast.success).not.toHaveBeenCalled();
});

it("blocks additions at the limit but permits removal", () => {
  candidates();
  mocks.query.mockReturnValue({ data: [...banners, { performanceId: 99, title: "Third", order: 3 }] });
  render();
  const add = control("New concert 배너 추가");
  expect(add.disabled).toBe(true);
  add.onClick();
  expect(mocks.save).not.toHaveBeenCalled();
  expect(control("Jazz 배너에서 제거").disabled).toBeFalsy();
});

it("blocks repeated clicks synchronously and keeps UI unchanged until success", async () => {
  candidates();
  let finish!: () => void;
  mocks.save.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  render();
  const add = control("New concert 배너 추가");
  add.onClick();
  add.onClick();
  control("Jazz 배너에서 제거").onClick();
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(toast.success).not.toHaveBeenCalled();
  mocks.mutation.mockReturnValue({ mutateAsync: mocks.save, isPending: true });
  expect(render()).toContain("배너 설정을 변경하는 중입니다.");
  const latest = mocks.control.mock.calls.map(([props]) => props).filter(props => props["aria-label"] === "New concert 배너 추가").at(-1);
  expect(latest.disabled).toBe(true);
  finish();
  await vi.waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
});

it("shows candidate loading, error/retry and empty states", () => {
  mocks.concerts.mockReturnValue({ isPending: true });
  expect(render()).toContain("공연 목록을 불러오는 중입니다.");
  const refetch = vi.fn();
  mocks.concerts.mockReturnValue({ isError: true, refetch });
  expect(render()).toContain("공연 목록을 불러오지 못했습니다.");
  mocks.control.mock.calls.map(([props]) => props).find(props => props.children === "공연 목록 다시 시도").onClick();
  expect(refetch).toHaveBeenCalledOnce();
  mocks.concerts.mockReturnValue({ data: { items: [], pagination: { totalPages: 1 } } });
  expect(render()).toContain("추가 가능한 공연이 없습니다.");
  mocks.concerts.mockReturnValue({ data: { items: [], pagination: { totalPages: 2 } } });
  expect(render()).toContain("다른 페이지를 확인해주세요.");
});

it("keeps cached banners visible but disables changes after a failed refresh", () => {
  mocks.query.mockReturnValue({ data: banners, isError: true });
  const html = render();
  expect(html).toContain("배너 목록을 불러오지 못했습니다.");
  expect(html).toContain("현재 배너 2 / 3");
  expect(control("Jazz 배너에서 제거").disabled).toBe(true);
});

it("loads later candidate pages with the existing pagination component", () => {
  mocks.concerts.mockImplementation(({ page }) => ({ data: {
    items: page === 0 ? [] : [{ id: 77, title: "Later concert", date: "2027-01-01" }],
    pagination: { totalPages: 2 },
  } }));
  let advanced = false;
  const visit = (node: React.ReactNode) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement<{ children?: React.ReactNode; onChange?: (page: number) => void }>(node)) return;
    if (!advanced && node.type === Pagination) {
      advanced = true;
      node.props.onChange!(1);
    }
    visit(node.props.children);
  };
  mocks.page.mockImplementation(visit);
  expect(render()).toContain("Later concert");
  expect(mocks.concerts).toHaveBeenLastCalledWith({ page: 1, size: 10 }, { refetchOnMount: "always" });
});
it("does not truncate unexpected extra banners", () => {
  mocks.query.mockReturnValue({ data: Array.from({ length: 4 }, (_, i) => ({ ...banners[0], performanceId: 100 + i })) });
  const html = render();
  expect(html).toContain("현재 배너 4 / 3");
  expect(html.match(/<li /g)).toHaveLength(4);
});
it("shows loading without an empty state or zero count", () => {
  mocks.query.mockReturnValue({ isPending: true });
  const html = render();
  expect(html).toContain('role="status"');
  expect(html).not.toContain("현재 등록된 배너가 없습니다.");
  expect(html).not.toContain("현재 배너 0 / 3");
});
it.each([undefined, banners])("shows an error and retries even when cached data exists (%j)", (data) => {
  const refetch = vi.fn();
  mocks.query.mockReturnValue({ data, isError: true, refetch });
  let retry: (() => void) | undefined;
  mocks.control.mockImplementation((props) => { if (props.children === "다시 시도") retry = props.onClick; });
  const html = render();
  expect(html).toContain('role="alert"');
  expect(html).toContain("배너 목록을 불러오지 못했습니다.");
  expect(html).not.toContain("현재 등록된 배너가 없습니다.");
  expect(html).not.toContain("현재 배너 0 / 3");
  retry!();
  expect(refetch).toHaveBeenCalledOnce();
});
it.each([null, undefined, "", "   "])("uses the missing-image fallback for %s", (imageUrl) => {
  mocks.query.mockReturnValue({ data: [{ ...banners[0], imageUrl }] });
  const html = render();
  expect(html).toContain("이미지 없음");
  expect(html).not.toContain("<img");
});
it("replaces a failed image while preserving the edit link", () => {
  let failed = false;
  function failImage(node: React.ReactNode) {
    if (Array.isArray(node)) { node.forEach(failImage); return; }
    if (!React.isValidElement<Record<string, unknown>>(node)) return;
    if (node.props.onError && !failed) { failed = true; (node.props.onError as () => void)(); }
    failImage(node.props.children as React.ReactNode);
  }
  mocks.row.mockImplementation((tree) => {
    failImage(tree);
  });
  const html = render();
  expect(html).not.toContain("<img");
  expect(html).toContain("이미지 없음");
  expect(html).toContain('href="/admin/concerts/60/edit"');
});
