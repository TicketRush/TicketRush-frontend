import { expect, it, vi } from "vitest";
import { updateConcertBanner } from "./adminBanners";
import { fetchBanners } from "./banners";
import { fetchConcertForEdit } from "./admin";
import apiClient from "./instance";

vi.mock("./useMock", () => ({ USE_MOCK: true }));
vi.mock("./mocks/_helpers", async original => ({
  ...await original<typeof import("./mocks/_helpers")>(),
  mockDelay: async () => {},
}));

it("persists mock remove/add in both banner and detail GETs without changing other concert data", async () => {
  const patch = vi.spyOn(apiClient, "patch");
  try {
    const before = await fetchConcertForEdit(1);
    expect(before.form.displayOnBanner).toBe(true);
    await expect(updateConcertBanner({ id: 11, displayOnBanner: true })).rejects.toThrow("최대 3개");
    await updateConcertBanner({ id: 1, displayOnBanner: false });
    expect((await fetchBanners()).map(item => item.performanceId)).not.toContain(1);
    const removed = await fetchConcertForEdit(1);
    expect(removed).toEqual({ ...before, form: { ...before.form, displayOnBanner: false, bannerSubtitle: "" } });
    await updateConcertBanner({ id: 11, displayOnBanner: true });
    expect((await fetchBanners()).map(item => item.performanceId)).toContain(11);
    expect((await fetchConcertForEdit(11)).form.displayOnBanner).toBe(true);
    expect(patch).not.toHaveBeenCalled();
  } finally { patch.mockRestore(); }
});
