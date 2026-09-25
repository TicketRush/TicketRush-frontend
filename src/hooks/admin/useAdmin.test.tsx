import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { adminKeys, useCreateConcert, useUpdateConcert } from "./useAdmin";
import { queryKeys } from "@/constants/queryKeys";
import type { ConcertFormData } from "@/types/domain/admin";
import type { BannerItem } from "@/types/domain/banner";

const api = vi.hoisted(() => ({ createConcertApi: vi.fn(), updateConcertApi: vi.fn() }));
vi.mock("@/api/admin", () => api);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const form: ConcertFormData = {
  title: "Concert", performer: "Artist", genre: "JAZZ", venue: "Venue",
  address: "Seoul", date: "2027-01-01", time: "19:30", price: 10000,
  durationMinutes: 90, description: "Description", imageMainUrl: "/poster.png",
  facilities: [], notices: [], displayOnBanner: true, bannerSubtitle: "Jazz",
};
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.stubGlobal("React", React);
  api.createConcertApi.mockReset().mockResolvedValue({ performanceId: 42 });
  api.updateConcertApi.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.unstubAllGlobals();
});

it.each([
  ["create", "success"], ["create", "failure"],
  ["update", "success"], ["update", "failure"],
] as const)("%s invalidates active banners without waiting for refetch %s", async (mode, outcome) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  const bannerKey = queryKeys.banners.list();
  client.setQueryData(bannerKey, []);
  client.setQueryData(adminKeys.concertEdit(42), {});
  client.setQueryData(queryKeys.concerts.detail(42), {});
  const refresh = deferred<BannerItem[]>();
  const started = deferred<void>();
  const finished = deferred<void>();
  const fetchBanners = vi.fn(() => { started.resolve(); return refresh.promise; });
  const observer = new QueryObserver(client, { queryKey: bannerKey, queryFn: fetchBanners, staleTime: Infinity, retry: false });
  let sawFetching = false;
  const unsubscribe = observer.subscribe((result) => {
    if (result.fetchStatus === "fetching") sawFetching = true;
    if (sawFetching && result.fetchStatus === "idle") finished.resolve();
  });
  let save!: () => Promise<unknown>;
  function Harness() {
    const create = useCreateConcert();
    const update = useUpdateConcert(42);
    save = mode === "create"
      ? () => create.mutateAsync({ form, totalSeats: 100, mainImage: new File(["poster"], "poster.png"), gallery: [] })
      : () => update.mutateAsync({ form, original: { ...form, displayOnBanner: false, bannerSubtitle: null } });
    return null;
  }
  renderToStaticMarkup(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  try {
    const saving = save();
    await started.promise;
    expect(fetchBanners).toHaveBeenCalledOnce();
    expect(client.getQueryState(bannerKey)).toMatchObject({ isInvalidated: true, fetchStatus: "fetching" });
    // The deferred banner GET is still unresolved here. An awaited invalidation
    // would prevent this from completing and fail the test.
    await saving;
    expect(client.getMutationCache().getAll().at(-1)?.state.status).toBe("success");
    expect(client.getQueryState(bannerKey)?.fetchStatus).toBe("fetching");
    expect(client.getQueryState(adminKeys.concertEdit(42))?.isInvalidated).toBe(true);
    if (mode === "update") {
      expect(api.updateConcertApi).toHaveBeenCalledWith(42, expect.objectContaining({ form }));
      expect(client.getQueryState(queryKeys.concerts.detail(42))?.isInvalidated).toBe(true);
    } else {
      expect(api.createConcertApi).toHaveBeenCalledOnce();
    }
    if (outcome === "failure") refresh.reject(new Error("Banner GET failed"));
    else refresh.resolve([{ performanceId: 42, title: "Concert", order: 1 }]);
    await finished.promise;
    expect(observer.getCurrentResult().status).toBe(outcome === "failure" ? "error" : "success");
    expect(client.getMutationCache().getAll().at(-1)?.state.status).toBe("success");
  } finally {
    unsubscribe();
    await client.cancelQueries();
  }
});
