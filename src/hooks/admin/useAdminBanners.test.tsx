import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { useUpdateConcertBanner } from "./useAdminBanners";
import { adminKeys } from "./useAdmin";
import { queryKeys } from "@/constants/queryKeys";

const api = vi.hoisted(() => ({ updateConcertBanner: vi.fn() }));
vi.mock("@/api/adminBanners", () => api);
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it.each([true, false])("refetches active banners and admin lists and invalidates detail after success=%s", async success => {
  vi.stubGlobal("React", React);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const bannerKey = queryKeys.banners.list();
  const listKey = adminKeys.concerts({ page: 0, size: 10 });
  const oldBanners = [{ performanceId: 1 }];
  client.setQueryData(bannerKey, oldBanners);
  client.setQueryData(listKey, { items: [{ id: 42 }] });
  client.setQueryData(adminKeys.concertEdit(42), { form: {} });
  client.setQueryData(queryKeys.concerts.detail(42), {});
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  api.updateConcertBanner.mockImplementation(() => new Promise<void>((yes, no) => { resolve = yes; reject = no; }));
  const bannerFetch = vi.fn(async () => success ? [{ performanceId: 1 }, { performanceId: 42 }] : oldBanners);
  const listFetch = vi.fn(async () => ({ items: [{ id: 42 }, { id: 43 }] }));
  const observers = [
    new QueryObserver(client, { queryKey: bannerKey, queryFn: bannerFetch, staleTime: Infinity }),
    new QueryObserver(client, { queryKey: listKey, queryFn: listFetch, staleTime: Infinity }),
  ];
  const unsubscribes = observers.map(observer => observer.subscribe(() => {}));
  let save!: ReturnType<typeof useUpdateConcertBanner>["mutateAsync"];
  function Harness() { save = useUpdateConcertBanner().mutateAsync; return null; }
  renderToStaticMarkup(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  try {
    const saving = save({ id: 42, displayOnBanner: true });
    const outcome = saving.then(() => null, error => error);
    await vi.waitFor(() => expect(api.updateConcertBanner).toHaveBeenCalledOnce());
    expect(client.getQueryData(bannerKey)).toEqual(oldBanners);
    expect(client.getMutationCache().getAll()[0].state.status).toBe("pending");
    expect(client.getMutationCache().getAll()[0].options.meta).toEqual({ skipGlobalErrorToast: true });
    if (success) resolve(); else reject(new Error("server max3"));
    expect(await outcome).toEqual(success ? null : new Error("server max3"));
    expect(bannerFetch).toHaveBeenCalledOnce();
    expect(listFetch).toHaveBeenCalledOnce();
    expect(client.getQueryData(bannerKey)).toEqual(success ? [{ performanceId: 1 }, { performanceId: 42 }] : oldBanners);
    expect(client.getQueryState(adminKeys.concertEdit(42))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.concerts.detail(42))?.isInvalidated).toBe(true);
  } finally {
    unsubscribes.forEach(unsubscribe => unsubscribe());
    client.clear();
  }
});

it("waits for refresh and keeps the cached list when a successful PATCH is followed by a failed GET", async () => {
  vi.stubGlobal("React", React);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const key = queryKeys.banners.list();
  const cached = [{ performanceId: 1 }];
  client.setQueryData(key, cached);
  let fail!: (error: Error) => void;
  const refresh = vi.fn(() => new Promise<never>((_resolve, reject) => { fail = reject; }));
  const observer = new QueryObserver(client, { queryKey: key, queryFn: refresh, staleTime: Infinity, retry: false });
  const unsubscribe = observer.subscribe(() => {});
  api.updateConcertBanner.mockResolvedValue(undefined);
  let save!: ReturnType<typeof useUpdateConcertBanner>["mutateAsync"];
  function Harness() { save = useUpdateConcertBanner().mutateAsync; return null; }
  renderToStaticMarkup(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  try {
    const saving = save({ id: 42, displayOnBanner: true });
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(client.getMutationCache().getAll()[0].state.status).toBe("pending");
    fail(new Error("GET failed"));
    await expect(saving).resolves.toBeUndefined();
    expect(client.getQueryData(key)).toEqual(cached);
    expect(observer.getCurrentResult().isError).toBe(true);
    expect(client.getMutationCache().getAll()[0].state.status).toBe("success");
  } finally { unsubscribe(); client.clear(); }
});
