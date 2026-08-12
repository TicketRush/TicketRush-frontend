// 배너 도메인 타입
//
// ⚠️ 배너 API는 백엔드 미구현 상태 (2026-06-30 기준).
// USE_MOCK = true 유지. 백엔드 완성 시 순차 교체.

export interface BannerItem {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  /** 좌상단 작은 태그 ("조기 예매 할인" 등) */
  tagLabel?: string;
  /** 제목 앞 + 우측 큰 워터마크 이모지 */
  iconEmoji?: string;
  date?: string;
  /** 배너 클릭 시 이동할 공연 ID (없으면 클릭 비활성) */
  linkConcertId?: number;
  /** 슬라이드 순서 */
  order: number;
}
