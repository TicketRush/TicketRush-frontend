/**
 * Mock 공연 데이터
 *
 * 백엔드 performance-service swagger (2026-06-30) 스펙 반영.
 *
 * 주요 변경 (프론트 mock → 백엔드 스펙):
 *   - artist → performer
 *   - date → showDate
 *   - time → showTime
 *   - posterUrl → imageMainUrl
 *   - galleryUrls → imageGalleryUrls
 *   - duration → durationMinutes
 *   - address 필드 신규 (각 공연마다 임의값)
 *
 * ⚠️ venue 필드는 유지 (백엔드에 venueName 필드 추가 요청 예정)
 * ⚠️ remainingSeats는 mock 편의상 유지. 실 API에선 별도 API(/seat/:id/seat-counts).
 */
import type { ConcertSummary, ConcertDetail } from "@/types/domain/concert";
import { mockDelay } from "./_helpers";

const POSTER = "/placeholder-poster.png";

export const MOCK_CONCERTS: ConcertSummary[] = [
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
    id: 2,
    title: "The Phantom of the Opera",
    performer: "뮤지컬 앙상블",
    genre: "MUSICAL",
    venue: "블루스퀘어 신한카드홀",
    address: "서울특별시 용산구 이태원로 294",
    showDate: "2026-06-15",
    showTime: "19:30",
    price: 88000,
    imageMainUrl: POSTER,
    totalSeats: 120,
    remainingSeats: 0,
    status: "SOLD_OUT",
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
];

export function getMockConcertDetail(id: number): ConcertDetail | null {
  const summary = MOCK_CONCERTS.find((c) => c.id === id);
  if (!summary) return null;

  return {
    ...summary,
    description:
      `${summary.title}의 특별한 공연이 ${summary.venue}에서 펼쳐집니다. ` +
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
