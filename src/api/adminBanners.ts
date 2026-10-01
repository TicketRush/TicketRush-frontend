import { fetchConcertForEdit, updateConcertApi } from "./admin";
import { fetchBanners } from "./banners";
import { MAX_BANNERS } from "@/types/domain/banner";

export interface BannerChange {
  id: number;
  displayOnBanner: boolean;
}

/** Reuse the edit diff builder; never construct an update from a list DTO. */
export async function updateConcertBanner({ id, displayOnBanner }: BannerChange) {
  const [{ form, status }, banners] = await Promise.all([
    fetchConcertForEdit(id),
    displayOnBanner ? fetchBanners() : Promise.resolve([]),
  ]);
  if (form.displayOnBanner === displayOnBanner) return;
  if (displayOnBanner) {
    if (banners.some((banner) => banner.performanceId === id)) return;
    if (banners.length >= MAX_BANNERS) {
      throw new Error(`배너는 최대 ${MAX_BANNERS}개까지 등록할 수 있습니다.`);
    }
  }
  await updateConcertApi(id, {
    status,
    original: form,
    form: { ...form, displayOnBanner },
    // No immediateBooking or files: preserve the stored schedule and assets.
  });
}
