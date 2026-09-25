import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminBannersPage from "./AdminBannersPage";
import type { BannerItem } from "@/types/domain/banner";

const mocks = vi.hoisted(() => ({ query: vi.fn(), control: vi.fn(), row: vi.fn() }));
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
function render() { return renderToStaticMarkup(<MemoryRouter><AdminBannersPage /></MemoryRouter>); }
beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.control.mockReset();
  mocks.row.mockReset();
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
  mocks.control.mockImplementation((props) => { if (props.onClick) retry = props.onClick; });
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
