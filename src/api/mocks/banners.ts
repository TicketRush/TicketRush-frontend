// Mock 배너
//
// ⚠️ 배너 API는 백엔드 미구현 상태 (2026-06-30 기준).
// USE_MOCK = true 유지. 백엔드 완성 시 순차 교체.

import type { BannerItem } from "@/types/domain/banner";
import { mockDelay } from "./_helpers";

const MOCK_BANNERS: BannerItem[] = [
  {
    id: 1,
    title: "Summer Jazz Night",
    subtitle: "여름밤의 재즈 향연",
    description: "세계적인 재즈 뮤지션과 함께하는 특별한 밤",
    tagLabel: "조기 예매 할인",
    iconEmoji: "🎵",
    date: "2026-06-15",
    order: 1,
  },
  {
    id: 2,
    title: "K-Pop Mega Concert",
    subtitle: "최고의 아이돌 스타 집결",
    description: "팬들이 기다린 드림 라인업 공개!",
    tagLabel: "VIP 패키지 판매중",
    iconEmoji: "🎤",
    date: "2026-07-20",
    order: 2,
  },
  {
    id: 3,
    title: "Classical Gala",
    subtitle: "클래식의 정수를 만나다",
    description: "세계 3대 오케스트라 내한 공연",
    tagLabel: "프리미엄 좌석 한정",
    iconEmoji: "🎹",
    date: "2026-08-10",
    order: 3,
  },
];

export async function mockGetBanners(): Promise<BannerItem[]> {
  await mockDelay(300);
  return [...MOCK_BANNERS].sort((a, b) => a.order - b.order);
}
