// Mock banners follow the #412 response contract.
import type { BannerItem } from "@/types/domain/banner";
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
