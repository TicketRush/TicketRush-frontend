import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ routes: [] as RouteObject[], auth: { accessToken: "test", user: { name: "Admin", role: "ADMIN" } } }));
vi.mock("react-router-dom", async (original) => ({
  ...await original<typeof import("react-router-dom")>(),
  createBrowserRouter: (routes: RouteObject[]) => { mocks.routes = routes; return {}; },
}));
vi.mock("@/stores/global/authStore", () => ({ default: (select: (state: typeof mocks.auth) => unknown) => select(mocks.auth) }));
vi.mock("@/hooks/queries/useBanners", () => ({ useBanners: () => ({ data: [], isPending: false }) }));
vi.mock("@/hooks/common/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));

beforeEach(async () => {
  vi.stubGlobal("React", React);
  mocks.auth.accessToken = "test";
  mocks.auth.user.role = "ADMIN";
  await import("@/App");
});
afterEach(() => vi.unstubAllGlobals());

it("renders the actual guarded route directly with active sidebar navigation", () => {
  const router = createMemoryRouter(mocks.routes, { initialEntries: ["/admin/banners"] });
  try {
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain("현재 배너 0 / 3");
    expect(html.match(/<a[^>]*href="\/admin\/banners"[^>]*>/)?.[0]).toContain('aria-current="page"');
  } finally { router.dispose(); }
});
it("navigates to the sidebar link destination using the real route definitions", async () => {
  const router = createMemoryRouter(mocks.routes, { initialEntries: ["/admin/banners"] });
  try {
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    const target = html.match(/<a[^>]*href="(\/admin\/banners)"[^>]*>/)?.[1];
    expect(html).toContain("배너 관리</a>");
    expect(target).toBe("/admin/banners");
    await router.navigate("/login");
    await router.navigate(target!);
    expect(router.state.location.pathname).toBe("/admin/banners");
    expect(renderToStaticMarkup(<RouterProvider router={router} />)).toContain("현재 배너 0 / 3");
  } finally { router.dispose(); }
});
it.each(["anonymous", "member"])("does not render banner management to %s users", (kind) => {
  if (kind === "anonymous") mocks.auth.accessToken = "";
  else mocks.auth.user.role = "MEMBER";
  const router = createMemoryRouter(mocks.routes, { initialEntries: ["/admin/banners"] });
  try {
    expect(renderToStaticMarkup(<RouterProvider router={router} />)).not.toContain("현재 배너 0 / 3");
  } finally { router.dispose(); }
});
