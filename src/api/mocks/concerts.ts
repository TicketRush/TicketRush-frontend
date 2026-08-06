/**
 * Mock 공연 데이터
 *
 * 백엔드 performance-service swagger (2026-06-30) 스펙 반영.
 *
 * 변경 이력:
 * - 2026-06-30: artist→performer, date→showDate, time→showTime,
 *   posterUrl→imageMainUrl, galleryUrls→imageGalleryUrls, address 필드 추가
 * - 2026-07-15 (이슈 #121):
 *   - status enum 정정: SOLD_OUT → CLOSED (백엔드 스펙 일치)
 *     (매진은 status가 아닌 availableCount === 0으로 유도)
 * - 2026-08-06 (이슈 #177):
 *   - 상세 진입 / 잔여 "-" 표시 검증용 상태별 fixture 추가
 *     (ON_SALE 매진, CLOSED, CANCELED, UPCOMING)
 *   - remainingSeats는 seats mock의 availableCount 시드와 동기화
 *
 * ⚠️ venue 필드는 유지 (백엔드 venueName 요청 대기)
 * ⚠️ remainingSeats는 mock 편의상 유지. 실 API에선 별도 API(/seat/:id/seat-counts).
 *
 * #177 수동 확인 가이드 (VITE_USE_MOCK=true):
 *   id 1  — ON_SALE + 잔여 > 0 → 예매하기 활성, 숫자/게이지 표시
 *   id 2  — ON_SALE + 잔여 0(매진) → 카드 클릭으로 상세 진입, 버튼 비활성, 잔여 0
 *   id 8  — CLOSED → 카드 클릭으로 상세 진입, 예매불가/매진, 잔여 "-"
 *   id 9  — CANCELED → 카드 클릭으로 상세 진입, 취소된 공연, 잔여 "-"
 *   id 10 — UPCOMING → 카드 클릭으로 상세 진입, 오픈 예정, 잔여 "-"
 * #178 카드 CTA / 썸네일 뱃지:
 *   id 2  — ON_SALE 매진: 버튼「매진」+ 우상단「매진」뱃지
 *   id 8  — CLOSED「예매 마감」(뱃지 없음)
 *   id 9  — CANCELED「공연 취소」+ dim (뱃지 없음)
 *   id 10 — UPCOMING「오픈 예정」(목록에 bookingOpenAt 없음 → 상세에서만 오픈 안내)
 * #178 카드 제목 줄수:
 *   id 11 — 제목 1줄 / id 12 — 제목 2줄
 */
import type { ConcertSummary, ConcertDetail } from "@/types/domain/concert";
import { mockDelay } from "./_helpers";

const POSTER = "/placeholder-poster.png";

export const MOCK_CONCERTS: ConcertSummary[] = [
  {
    // #178: 제목 1줄 — id 12와 나란히 CTA 정렬 비교
    id: 11,
    title: "짧은 제목",
    performer: "One Line Act",
    genre: "JAZZ",
    venue: "블루노트 서울",
    address: "서울특별시 용산구 이태원로 227",
    showDate: "2026-08-18",
    showTime: "20:00",
    price: 55000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 48,
    status: "ON_SALE",
  },
  {
    // #178: 제목 2줄 — line-clamp-2로 두 줄까지 차는 긴 공연명
    id: 12,
    title:
      "[Mock] 카드 제목 두 줄 검증용 — 목록 그리드에서 예매 버튼 위치가 어긋나는지 확인하는 매우 긴 공연명입니다",
    performer: "Two Line Ensemble",
    genre: "CONCERT",
    venue: "올림픽공원 핸드볼경기장",
    address: "서울특별시 송파구 올림픽로 424",
    showDate: "2026-08-19",
    showTime: "19:00",
    price: 55000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 48,
    status: "ON_SALE",
  },
  {
    id: 1,
    title: "BTS World Tour: Beyond the Stars",
    performer: "BTS",
    genre: "CONCERT",
    venue: "잠실 올림픽 주경기장",
    address: "서울특별시 송파구 올림픽로 25",
    showDate: "2026-07-20",
    showTime: "18:00",
    price: 132000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 23,
    status: "ON_SALE",
  },
  {
    // #177: ON_SALE + availableCount === 0 (기술적 매진)
    id: 2,
    title: "[Mock] 매진 공연 (ON_SALE + 잔여 0)",
    performer: "Sold Out Band",
    genre: "CONCERT",
    venue: "올림픽공원 핸드볼경기장",
    address: "서울특별시 송파구 올림픽로 424",
    showDate: "2026-06-15",
    showTime: "19:30",
    price: 88000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 0,
    status: "ON_SALE",
  },
  {
    id: 3,
    title: "Classical Evening: Beethoven Symphony",
    performer: "서울시향",
    genre: "CLASSIC",
    venue: "예술의전당 콘서트홀",
    address: "서울특별시 서초구 남부순환로 2406",
    showDate: "2026-08-10",
    showTime: "19:00",
    price: 55000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 87,
    status: "ON_SALE",
  },
  {
    id: 4,
    title: "Jazz Night Live",
    performer: "나윤선 트리오",
    genre: "JAZZ",
    venue: "LG아트센터",
    address: "서울특별시 강남구 논현로 508",
    showDate: "2026-06-28",
    showTime: "20:00",
    price: 66000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 45,
    status: "ON_SALE",
  },
  {
    id: 5,
    title: "Ultra Music Festival Korea",
    performer: "Various Artists",
    genre: "FESTIVAL",
    venue: "난지한강공원",
    address: "서울특별시 마포구 한강난지로 12",
    showDate: "2026-09-05",
    showTime: "14:00",
    price: 154000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 12,
    status: "ON_SALE",
  },
  {
    id: 6,
    title: "BLACKPINK Fan Meeting",
    performer: "BLACKPINK",
    genre: "FANMEETING",
    venue: "KSPO DOME",
    address: "서울특별시 송파구 올림픽로 424",
    showDate: "2026-07-01",
    showTime: "17:00",
    price: 99000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 3,
    status: "ON_SALE",
  },
  {
    id: 7,
    title: "Swan Lake",
    performer: "국립발레단",
    genre: "BALLET",
    venue: "예술의전당 오페라극장",
    address: "서울특별시 서초구 남부순환로 2406",
    showDate: "2026-08-22",
    showTime: "15:00",
    price: 77000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 56,
    status: "ON_SALE",
  },
  {
    // #177: CLOSED — 상세 진입 가능, seat-counts 미조회 → 잔여 "-"
    id: 8,
    title: "[Mock] 종료된 공연 (CLOSED)",
    performer: "Closed Orchestra",
    genre: "CLASSIC",
    venue: "세종문화회관",
    address: "서울특별시 종로구 세종대로 175",
    showDate: "2026-05-01",
    showTime: "19:00",
    price: 44000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 0,
    status: "CLOSED",
  },
  {
    // #177: CANCELED — 상세 진입 가능, 버튼「취소된 공연」, 잔여 "-"
    id: 9,
    title: "[Mock] 취소된 공연 (CANCELED)",
    performer: "Canceled Crew",
    genre: "MUSICAL",
    venue: "충무아트센터",
    address: "서울특별시 중구 퇴계로 387",
    showDate: "2026-07-12",
    showTime: "19:30",
    price: 77000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 40,
    status: "CANCELED",
  },
  {
    // #177/#178: UPCOMING — 목록 CTA「오픈 예정」, 잔여 "-"
    // bookingOpenAt은 목록 API에 없음 → 상세 mock에서만 주입
    id: 10,
    title: "[Mock] 오픈 예정 공연 (UPCOMING)",
    performer: "Upcoming Stars",
    genre: "CONCERT",
    venue: "고척스카이돔",
    address: "서울특별시 구로구 경인로 430",
    showDate: "2026-10-01",
    showTime: "18:00",
    price: 110000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 120,
    status: "UPCOMING",
  },
];

export function getMockConcertDetail(id: number): ConcertDetail | null {
  const summary = MOCK_CONCERTS.find((c) => c.id === id);
  if (!summary) return null;

  const totalSeats = summary.totalSeats ?? 120;

  return {
    ...summary,
    totalSeats,
    // 상세 API에만 있는 bookingOpenAt (목록 mock에는 없음)
    bookingOpenAt:
      summary.status === "UPCOMING" ? "2026-09-15T12:00:00" : null,
    description:
      `${summary.title}의 특별한 공연이 ${summary.venue ?? summary.address}에서 펼쳐집니다. ` +
      `${summary.performer}의 감동적인 무대를 놓치지 마세요. ` +
      "이번 공연은 최고의 음향 시스템과 조명으로 관객 여러분께 " +
      "잊지 못할 경험을 선사합니다.",
    durationMinutes: 120,
    facilities: [
      { icon: "🔊", label: "최신 음향 시스템" },
      { icon: "🅿️", label: "주차 시설 (유료)" },
      { icon: "🍽️", label: "푸드코트" },
      { icon: "♿", label: "휠체어 접근 가능" },
      { icon: "🚻", label: "수유실" },
      { icon: "📶", label: "무료 Wi-Fi" },
    ],
    imageGalleryUrls: [POSTER, POSTER, POSTER],
    notices: [
      "예매 후 취소/환불은 공연 7일 전까지만 가능합니다.",
      "공연 당일 티켓과 신분증을 지참해주세요.",
      "미성년자는 보호자 동반이 필요합니다.",
    ],
  };
}

export { mockDelay };
