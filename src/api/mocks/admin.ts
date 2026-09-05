// Mock 관리자 데이터
//
// NOTE: 관리자(백오피스) mock은 현재 백엔드 미구현 상태이므로 관리 편의성
// 차원에서 `date` + `time` 폼 필드를 유지합니다. 퍼블릭 도메인(사용자)
// 필드(`showDate`/`showTime`)와 네이밍이 다른 것은 의도적이며, 실제 API
// 연동 시에는 폼 값을 변환하여 전송하도록 어댑터를 적용할 예정입니다.
//
// 이번 리팩터링에서는 다른 도메인(concert, seat, booking)의 필드명
// 변경을 반영해 내부 참조와 타입을 정리했습니다. mock 데이터 구조의
// 일부 필드명(date/time 등)은 admin 용도에서 의도적으로 보존됩니다.
//
// 변경 요약:
//   - AdminBookingItem.seatNumbers → seatNumbers
//   - AdminSeatDetail.seatNumber → seatNumber
//   - ConcertFormData 반환값 필드명 정렬 (artist → performer 등)

import { mockDelay, mockError } from "./_helpers";
import { MOCK_CONCERTS } from "./concerts";
import {
  _findMockBookingBySeat,
  _findMockBooking,
  _updateMockBookingStatus,
} from "./bookings";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import type {
  AdminConcertItem,
  AdminConcertListParams,
  AdminConcertListResponse,
  AdminDashboardData,
  AdminDashboardParams,
  AdminDashboardStats,
  DailyRevenue,
  GenreRevenue,
  AdminBookingStats,
  AdminBookingItem,
  AdminBookingListParams,
  AdminBookingListResponse,
  AdminSeatStats,
  AdminSeatDetail,
  ConcertFormData,
} from "@/types/domain/admin";
import type { Genre } from "@/types/domain/concert";
import {
  DEFAULT_DASHBOARD_PERIOD_DAYS,
  inclusiveDayCount,
  MAX_DASHBOARD_PERIOD_DAYS,
  parseLocalDateKey,
  toLocalDateKey,
} from "@/utils/admin/dashboardPeriod";

/**
 * MOCK_CONCERTS 항목에서 totalSeats / 판매 좌석 수 파생.
 * totalSeats·remainingSeats가 optional이므로 safe 접근 필요.
 */
function getTotalSeats(c: (typeof MOCK_CONCERTS)[number]): number {
  return c.totalSeats ?? 0;
}

function getSold(c: (typeof MOCK_CONCERTS)[number]): number {
  return getTotalSeats(c) - (c.remainingSeats ?? 0);
}

const GENRE_LABELS: Record<Genre, string> = {
  CONCERT: "콘서트",
  MUSICAL: "뮤지컬",
  CLASSIC: "클래식",
  JAZZ: "재즈",
  FESTIVAL: "페스티벌",
  FANMEETING: "팬미팅",
  BALLET: "발레",
};

function buildAdminConcertItems(): AdminConcertItem[] {
  return MOCK_CONCERTS.map((c) => {
    const sold = getSold(c);
    const total = getTotalSeats(c);
    return {
      id: c.id,
      title: c.title,
      genre: c.genre,
      date: c.showDate,
      soldSeats: sold,
      totalSeats: total,
      occupancyRate: total > 0 ? sold / total : 0,
      revenue: sold * c.price,
      soldOut: total > 0 && sold >= total,
      status: c.status,
    };
  });
}

function defaultDashboardParams(): AdminDashboardParams {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (DEFAULT_DASHBOARD_PERIOD_DAYS - 1));
  return { from: toLocalDateKey(from), to: toLocalDateKey(to) };
}

// ── 대시보드 ───────────────────────────────────────────
export async function mockGetAdminDashboard(
  params: AdminDashboardParams = defaultDashboardParams(),
): Promise<AdminDashboardData> {
  await mockDelay(500);

  const from = parseLocalDateKey(params.from);
  const to = parseLocalDateKey(params.to);
  if (from.getTime() > to.getTime()) {
    await mockError(
      ERROR_CODES.PERFORMANCE_INVALID_DASHBOARD_PERIOD,
      "조회 시작일은 종료일보다 늦을 수 없습니다.",
    );
  }
  if (inclusiveDayCount(from, to) > MAX_DASHBOARD_PERIOD_DAYS) {
    await mockError(
      ERROR_CODES.PERFORMANCE_DASHBOARD_PERIOD_TOO_LONG,
      "조회 기간은 최대 92일까지 지정할 수 있습니다.",
    );
  }

  const totalSold = MOCK_CONCERTS.reduce((sum, c) => sum + getSold(c), 0);
  const occupancyTargets = MOCK_CONCERTS.filter(
    (c) => c.status === "ON_SALE" || c.status === "CLOSED",
  );
  const occupancySold = occupancyTargets.reduce(
    (sum, c) => sum + getSold(c),
    0,
  );
  const occupancyTotal = occupancyTargets.reduce(
    (sum, c) => sum + getTotalSeats(c),
    0,
  );
  const totalRevenue = MOCK_CONCERTS.reduce(
    (sum, c) => sum + getSold(c) * c.price,
    0,
  );

  const stats: AdminDashboardStats = {
    totalConcerts: MOCK_CONCERTS.length,
    soldTickets: totalSold,
    totalRevenue,
    averageOccupancyRate:
      occupancyTotal > 0 ? occupancySold / occupancyTotal : 0,
  };

  const dayCount = inclusiveDayCount(from, to);
  const dailyRevenue: DailyRevenue[] = Array.from({ length: dayCount }).map(
    (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      return {
        date: toLocalDateKey(d),
        revenue: Math.floor(10_000 + ((i * 1_973) % 20_000)),
        ticketsSold: 15 + (i % 30),
      };
    },
  );

  const genreMap = new Map<Genre, { revenue: number; label: string }>();
  MOCK_CONCERTS.forEach((c) => {
    const revenue = getSold(c) * c.price;
    const prev = genreMap.get(c.genre);
    genreMap.set(c.genre, {
      revenue: (prev?.revenue ?? 0) + revenue,
      label: GENRE_LABELS[c.genre],
    });
  });
  const totalGenreRev = Array.from(genreMap.values()).reduce(
    (sum, g) => sum + g.revenue,
    0,
  );
  const genreRevenue: GenreRevenue[] = Array.from(genreMap.entries())
    .map(([genre, v]) => ({
      genre,
      label: v.label,
      revenue: v.revenue,
      percentage: totalGenreRev > 0 ? (v.revenue / totalGenreRev) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { stats, dailyRevenue, genreRevenue };
}

export async function mockGetAdminConcerts(
  params: AdminConcertListParams = {},
): Promise<AdminConcertListResponse> {
  await mockDelay(400);

  const items = buildAdminConcertItems();
  const size = Math.min(params.size ?? 10, 50);
  const pageIndex = params.page ?? 0;
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = pageIndex * size;

  return {
    items: items.slice(start, start + size),
    pagination: {
      pageIndex,
      size,
      totalElements,
      totalPages,
      hasNext: start + size < totalElements,
    },
  };
}

// ── 예매 내역 관리 ────────────────────────────────────
const ADMIN_USERS = [
  { name: "김철수", email: "user@example.com" },
  { name: "박민수", email: "minsoo@example.com" },
  { name: "이지은", email: "jieun@example.com" },
  { name: "최서연", email: "seoyeon@example.com" },
  { name: "정하늘", email: "haneul@example.com" },
];
const PAYMENT_METHODS = ["간편결제", "신용카드", "카카오페이", "네이버페이"];

const ADMIN_BOOKINGS: AdminBookingItem[] = (() => {
  const items: AdminBookingItem[] = [];
  for (let i = 0; i < 30; i++) {
    const concert = MOCK_CONCERTS[i % MOCK_CONCERTS.length];
    const user = ADMIN_USERS[i % ADMIN_USERS.length];
    const seatId = (i % 120) + 1;
    const rowIdx = Math.floor((seatId - 1) / 12);
    const colIdx = ((seatId - 1) % 12) + 1;
    const seatNumber = `${String.fromCharCode("A".charCodeAt(0) + rowIdx)}-${colIdx}`;

    const isCancelled = i % 7 === 0;
    items.push({
      bookingNumber: `X${7000 + i}-KLPW${i % 10}`,
      concertTitle: concert.title,
      concertDate: `${concert.showDate} ${concert.showTime}`,
      bookedAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      userName: user.name,
      userEmail: user.email,
      seatNumbers: [seatNumber],
      seatCount: 1,
      unitPrice: concert.price,
      totalAmount: concert.price,
      status: isCancelled ? "CANCELED" : "CONFIRMED",
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
    });
  }
  return items;
})();

export async function mockGetAdminBookings(
  params: AdminBookingListParams,
): Promise<AdminBookingListResponse> {
  await mockDelay(400);

  let filtered = [...ADMIN_BOOKINGS];

  if (params.status && params.status !== "ALL") {
    filtered = filtered.filter((b) => b.status === params.status);
  }
  if (params.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.concertTitle.toLowerCase().includes(kw) ||
        b.userName.toLowerCase().includes(kw) ||
        b.bookingNumber.toLowerCase().includes(kw),
    );
  }

  const size = params.size ?? 10;
  const pageIndex = params.page ?? 0;
  const totalElements = filtered.length;
  const totalPages = Math.ceil(totalElements / size);
  const start = pageIndex * size;
  const items = filtered.slice(start, start + size);

  return {
    items,
    pagination: {
      pageIndex,
      size,
      totalElements,
      totalPages,
      hasNext: start + size < totalElements,
    },
  };
}

export async function mockGetAdminBookingStats(): Promise<AdminBookingStats> {
  await mockDelay(200);
  return {
    totalBookings: ADMIN_BOOKINGS.length,
    completedBookings: ADMIN_BOOKINGS.filter((b) => b.status === "CONFIRMED")
      .length,
    totalRevenue: ADMIN_BOOKINGS.filter((b) => b.status === "CONFIRMED").reduce(
      (sum, b) => sum + b.totalAmount,
      0,
    ),
    cancelledBookings: ADMIN_BOOKINGS.filter((b) => b.status === "CANCELED")
      .length,
  };
}

export async function mockAdminRefundBooking(
  bookingNumber: string,
): Promise<void> {
  await mockDelay(500);
  const booking = ADMIN_BOOKINGS.find((b) => b.bookingNumber === bookingNumber);
  if (!booking) {
    await mockError("BOOKING_NOT_FOUND", "예매 정보를 찾을 수 없습니다.");
  }
  if (booking!.status === "CANCELED") {
    await mockError("ALREADY_CANCELLED", "이미 취소된 예매입니다.");
  }
  booking!.status = "CANCELED";

  // 사용자 mock bookings 저장소도 함께 동기화 (있다면)
  const userSide = _findMockBooking(bookingNumber);
  if (userSide) {
    _updateMockBookingStatus(bookingNumber, "CANCELED");
  }
}

// ── 좌석 모니터링 ─────────────────────────────────────
// mock 좌석 데이터는 seats.ts와 별도로 관리. 앞열=낮은 행.
// price 필드는 개별 좌석에 없음 (백엔드 스펙).
export async function mockGetAdminSeatMonitoring(
  _performanceId: number,
): Promise<{
  stats: AdminSeatStats;
  seats: Array<{
    id: number;
    seatLayoutId: number;
    seatNumber: string;
    row: string;
    col: number;
    status: import("@/types/domain/seat").SeatStatus;
  }>;
}> {
  await mockDelay(400);

  const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const COLS = 12;
  const seats: Array<{
    id: number;
    seatLayoutId: number;
    seatNumber: string;
    row: string;
    col: number;
    status: import("@/types/domain/seat").SeatStatus;
  }> = [];
  let id = 1;
  let available = 0,
    sold = 0,
    holding = 0;
  ROWS.forEach((row) => {
    for (let col = 1; col <= COLS; col++) {
      const r = Math.random();
      let status: import("@/types/domain/seat").SeatStatus = "AVAILABLE";
      if (r < 0.2) {
        status = "HOLD";
        holding++;
      } else if (r < 0.55) {
        status = "SOLD";
        sold++;
      } else {
        available++;
      }
      seats.push({
        id,
        seatLayoutId: id,
        seatNumber: `${row}-${col}`,
        row,
        col,
        status,
      });
      id++;
    }
  });

  return {
    stats: {
      totalSeats: seats.length,
      availableSeats: available,
      soldSeats: sold,
      holdingSeats: holding,
    },
    seats,
  };
}

export async function mockGetAdminSeatDetail(
  performanceId: number,
  seatId: number,
): Promise<AdminSeatDetail> {
  await mockDelay(200);

  // 좌석 번호 계산
  const rowIdx = Math.floor((seatId - 1) / 12);
  const colIdx = ((seatId - 1) % 12) + 1;
  const seatNumber = `${String.fromCharCode("A".charCodeAt(0) + rowIdx)}-${colIdx}`;

  // booking store에서 해당 seatId의 예매 정보 조회
  const booking = _findMockBookingBySeat(performanceId, seatId);

  if (booking) {
    if (booking.status === "PENDING") {
      const elapsedMs = Date.now() - new Date(booking.createdAt).getTime();
      const remainingSec = Math.max(0, 300 - Math.floor(elapsedMs / 1000));
      return {
        seatId,
        seatNumber, // ← 변경
        status: "HOLD",
        reservedBy: "예매 진행자",
        reservedAt: booking.createdAt,
        holdRemainingSec: remainingSec,
      };
    }
    if (booking.status === "CONFIRMED") {
      return {
        seatId,
        seatNumber, // ← 변경
        status: "SOLD",
        reservedBy: "김철수",
        reservedAt: booking.paidAt ?? booking.createdAt,
      };
    }
  }

  return {
    seatId,
    seatNumber, // ← 변경
    status: "AVAILABLE",
  };
}

export async function mockAdminReleaseSeat(
  _performanceId: number,
  _seatId: number,
): Promise<void> {
  await mockDelay(300);
  // 강제 해제 — mock에선 noop
}

// ── 공연 CRUD ────────────────────────────────────────
export async function mockCreateConcert(
  _data: ConcertFormData,
): Promise<{ id: number }> {
  await mockDelay(500);
  const newId = Math.max(...MOCK_CONCERTS.map((c) => c.id)) + 1;
  return { id: newId };
}

export async function mockUpdateConcert(
  id: number,
  _data: ConcertFormData,
): Promise<void> {
  await mockDelay(500);
  const concert = MOCK_CONCERTS.find((c) => c.id === id);
  if (!concert) {
    await mockError("CONCERT_NOT_FOUND", "공연을 찾을 수 없습니다.");
  }
}

export async function mockDeleteConcert(_id: number): Promise<void> {
  await mockDelay(500);
}

export async function mockGetConcertForEdit(
  id: number,
): Promise<ConcertFormData> {
  await mockDelay(300);
  const concert = MOCK_CONCERTS.find((c) => c.id === id);
  if (!concert) {
    await mockError("CONCERT_NOT_FOUND", "공연을 찾을 수 없습니다.");
  }
  return {
    title: concert!.title,
    performer: concert!.performer,
    genre: concert!.genre,
    // venue는 optional (백엔드에 없음) → address fallback
    venue: concert!.venue ?? concert!.address,
    address: concert!.address,
    date: concert!.showDate,
    time: concert!.showTime,
    price: concert!.price,
    durationMinutes: 120,
    description: "공연 설명...",
    imageMainUrl: concert!.imageMainUrl,
    facilities: [],
    notices: [],
  };
}
