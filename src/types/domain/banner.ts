// 배너 도메인 타입 — 백엔드 BannerResponse와 동일 (#564 / FE #190)
//
// 옵셔널 필드는 서버 Jackson NON_NULL로 키 자체가 생략된다 (null이 아님).

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
  /** 슬라이드 순서 (서버 정렬 키. 클라는 배열 순서를 그대로 사용) */
  order: number;
}
