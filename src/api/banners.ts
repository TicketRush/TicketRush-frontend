// GET /api/v1/banner: shared interceptor unwraps result and converts snake_case.
import type { BannerItem } from "@/types/domain/banner";
import { mockGetBanners } from "./mocks/banners";
import apiClient from "./instance";
import { USE_MOCK } from "./useMock";

/** #412 wire contract. The shared client converts keys before returning data. */
export interface BannerResponse {
  performance_id: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  date?: string | null;
  image_url?: string | null;
  order: number;
}

type ConvertedBannerResponse = Omit<BannerResponse, "performance_id" | "image_url"> & {
  performanceId: number;
  imageUrl?: string | null;
};

export async function fetchBanners(): Promise<BannerItem[]> {
  if (USE_MOCK) return mockGetBanners();

  const res = await apiClient.get<ConvertedBannerResponse[]>("/api/v1/banner");
  return (res.data ?? []).map((item) => ({
    performanceId: item.performanceId,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    date: item.date,
    imageUrl: item.imageUrl,
    order: item.order,
  }));
}
