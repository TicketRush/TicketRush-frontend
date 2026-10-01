// Mock banners follow the #412 response contract.
import { MAX_BANNERS, type BannerItem } from "@/types/domain/banner";
import type { ConcertFormData } from "@/types/domain/admin";
import { bannerSettingsRequest } from "../adminConcertCreate";
import { mockDelay } from "./_helpers";

const MOCK_BANNERS: BannerItem[] = [
  {
    performanceId: 1,
    title: "Summer Jazz Night",
    subtitle: "여름밤의 재즈 향연",
    description: "세계적인 재즈 뮤지션과 함께하는 특별한 밤",
    date: "2026-09-15",
    order: 1,
  },
  {
    performanceId: 2,
    title: "K-Pop Mega Concert",
    subtitle: "최고의 아이돌 스타 집결",
    description: "팬들이 기다린 드림 라인업 공개!",
    date: "2026-10-20",
    order: 2,
  },
  {
    performanceId: 3,
    title: "Classical Gala",
    subtitle: "클래식의 정수를 만나다",
    description: "세계 3대 오케스트라 내한 공연",
    date: "2026-11-10",
    order: 3,
  },
];

export async function mockGetBanners(): Promise<BannerItem[]> {
  await mockDelay(300);
  return [...MOCK_BANNERS];
}

export function getMockBannerSettings(id: number) {
  const banner = MOCK_BANNERS.find((item) => item.performanceId === id);
  return { displayOnBanner: !!banner, bannerSubtitle: banner?.subtitle ?? null };
}

/** Keep the mock banner GET and concert detail consistent after the existing edit API. */
export function updateMockBanner(id: number, form: ConcertFormData) {
  const index = MOCK_BANNERS.findIndex((item) => item.performanceId === id);
  const settings = bannerSettingsRequest(form);
  if (!settings.display_on_banner) {
    if (index >= 0) MOCK_BANNERS.splice(index, 1);
    return;
  }
  if (index < 0 && MOCK_BANNERS.length >= MAX_BANNERS) {
    throw new Error(`배너는 최대 ${MAX_BANNERS}개까지 등록할 수 있습니다.`);
  }
  const banner: BannerItem = {
    performanceId: id, title: form.title, subtitle: settings.banner_subtitle,
    description: form.description, date: form.date, imageUrl: form.imageMainUrl,
    order: index >= 0 ? MOCK_BANNERS[index].order : Math.max(0, ...MOCK_BANNERS.map(item => item.order)) + 1,
  };
  if (index >= 0) MOCK_BANNERS[index] = banner;
  else MOCK_BANNERS.push(banner);
}
