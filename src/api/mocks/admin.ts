// Mock 관리자 데이터
import { mockDelay, mockError } from "./_helpers";
import { MOCK_CONCERTS } from "./concerts";
import { _findMockBookingBySeat } from "./bookings";import type {
  AdminDashboardStats,
  DailyRevenue,
  GenreRevenue,
  ConcertSalesStatus,
  AdminConcertItem,
  AdminBookingStats,
  AdminBookingItem,
  AdminBookingListParams,
  AdminBookingListResponse,
  AdminSeatStats,
  AdminSeatDetail,
  ConcertFormData,
} from "@/types/domain/admin";
import type { Genre } from "@/types/domain/concert";

// ── 대시보드 ───────────────────────────────────────────
export async function mockGetAdminDashboard() {
  await mockDelay(500);

  const totalSold = MOCK_CONCERTS.reduce(
    (sum, c) => sum + (c.totalSeats - c.remainingSeats),
    0,
  );
  const totalSeats = MOCK_CONCERTS.reduce((sum, c) => sum + c.totalSeats, 0);
  const totalRevenue = MOCK_CONCERTS.reduce(
    (sum, c) => sum + (c.totalSeats - c.remainingSeats) * c.price,
    0,
  );

  const stats: AdminDashboardStats = {
    totalConcerts: MOCK_CONCERTS.length,
    soldTickets: totalSold,
    totalRevenue,
    averageOccupancyRate: totalSeats > 0 ? totalSold / totalSeats : 0,
  };

  // 일별 매출 — 최근 7일 mock
  const dailyRevenue: DailyRevenue[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split("T")[0],
      revenue: Math.floor(10000 + Math.random() * 20000),
      ticketsSold: Math.floor(15 + Math.random() * 30),
    };
  });

  // 장르별 매출 — 전체 공연 합산
  const genreMap = new Map<Genre, { revenue: number; label: string }>();
  const GENRE_LABELS: Record<Genre, string> = {
    CONCERT: "콘서트",
    MUSICAL: "뮤지컬",
    CLASSIC: "클래식",
    JAZZ: "재즈",
    FESTIVAL: "페스티벌",
    FANMEETING: "팬미팅",
    BALLET: "발레",
  };
  MOCK_CONCERTS.forEach((c) => {
    const revenue = (c.totalSeats - c.remainingSeats) * c.price;
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

  // 공연별 판매 현황
  const concertSales: ConcertSalesStatus[] = MOCK_CONCERTS.map((c) => {
    const sold = c.totalSeats - c.remainingSeats;
    return {
      concertId: c.id,
      title: c.title,
      genre: c.genre,
      date: c.date,
      soldSeats: sold,
      totalSeats: c.totalSeats,
      occupancyRate: c.totalSeats > 0 ? sold / c.totalSeats : 0,
      revenue: sold * c.price,
      isSoldOut: c.status === "SOLD_OUT",
    };
  });

  // 전체 공연 목록 (관리자 테이블용)
  const concertList: AdminConcertItem[] = MOCK_CONCERTS.map((c) => {
    const sold = c.totalSeats - c.remainingSeats;
    return {
      id: c.id,
      title: c.title,
      genre: c.genre,
      date: c.date,
      soldSeats: sold,
      totalSeats: c.totalSeats,
      occupancyRate: c.totalSeats > 0 ? sold / c.totalSeats : 0,
      revenue: sold * c.price,
      status: c.status,
    };
  });

  return { stats, dailyRevenue, genreRevenue, concertSales, concertList };
}

// ── 예매 내역 관리 ────────────────────────────────────
// 메모리 mock — 충분한 데이터 생성
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
    const seatLabel = `${String.fromCharCode("A".charCodeAt(0) + rowIdx)}-${colIdx}`;

    const isCancelled = i % 7 === 0;
    items.push({
      bookingNumber: `X${7000 + i}-KLPW${i % 10}`,
      concertTitle: concert.title,
      concertDate: `${concert.date} ${concert.time}`,
      bookedAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
      userName: user.name,
      userEmail: user.email,
      seatLabels: [seatLabel],
      seatCount: 1,
      unitPrice: concert.price,
      totalAmount: concert.price,
      status: isCancelled ? "CANCELLED" : "CONFIRMED",
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
    cancelledBookings: ADMIN_BOOKINGS.filter((b) => b.status === "CANCELLED")
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
  if (booking!.status === "CANCELLED") {
    await mockError("ALREADY_CANCELLED", "이미 취소된 예매입니다.");
  }
  booking!.status = "CANCELLED";

  // 사용자 mock bookings 저장소도 함께 동기화 (있다면)
  const userSide = _findMockBooking(bookingNumber);
  if (userSide) {
    _updateMockBookingStatus(bookingNumber, "CANCELLED");
  }
}

// ── 좌석 모니터링 ─────────────────────────────────────
// 사용자 mock seats.ts와 동일 패턴 — 별도 함수로 구현
export async function mockGetAdminSeatMonitoring(performanceId: number): Promise<{
  stats: AdminSeatStats;
  seats: Array<{
    id: number;
    layoutId: number;
    label: string;
    row: string;
    col: number;
    status: import("@/types/domain/seat").SeatStatus;
  }>;
}> {
  await mockDelay(400);

  // 좌석 상태 mock (간단하게 새로 생성 - 실제로는 seats.ts와 공유)
  const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const COLS = 12;
  const seats: any[] = [];
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
        layoutId: id,
        label: `${row}-${col}`,
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

  // 좌석 라벨 계산
  const rowIdx = Math.floor((seatId - 1) / 12);
  const colIdx = ((seatId - 1) % 12) + 1;
  const label = `${String.fromCharCode("A".charCodeAt(0) + rowIdx)}-${colIdx}`;

  // booking store에서 해당 seatId의 예매 정보 조회 (백엔드 패턴 동일)
  const booking = _findMockBookingBySeat(performanceId, seatId);

  if (booking) {
    if (booking.status === "PENDING") {
      // PENDING = HOLD 상태 — 타이머 진행중
      const elapsedMs = Date.now() - new Date(booking.createdAt).getTime();
      const remainingSec = Math.max(0, 300 - Math.floor(elapsedMs / 1000)); // 5분
      return {
        seatId,
        seatLabel: label,
        status: "HOLD",
        reservedBy: "예매 진행자",
        reservedAt: booking.createdAt,
        holdRemainingSec: remainingSec,
      };
    }
    if (booking.status === "CONFIRMED") {
      return {
        seatId,
        seatLabel: label,
        status: "SOLD",
        reservedBy: "김철수", // mock: 실제 백엔드에선 booking.userName
        reservedAt: booking.paidAt ?? booking.createdAt,
      };
    }
  }

  return {
    seatId,
    seatLabel: label,
    status: "AVAILABLE",
  };
}

export async function mockAdminReleaseSeat(
  performanceId: number,
  seatId: number,
): Promise<void> {
  await mockDelay(300);
  // 강제 해제 — mock에선 noop
}

// ── 공연 CRUD ────────────────────────────────────────
export async function mockCreateConcert(
  data: ConcertFormData,
): Promise<{ id: number }> {
  await mockDelay(500);
  const newId = Math.max(...MOCK_CONCERTS.map((c) => c.id)) + 1;
  // 실제로는 MOCK_CONCERTS에 push해야 함
  return { id: newId };
}

export async function mockUpdateConcert(
  id: number,
  data: ConcertFormData,
): Promise<void> {
  await mockDelay(500);
  const concert = MOCK_CONCERTS.find((c) => c.id === id);
  if (!concert) {
    await mockError("CONCERT_NOT_FOUND", "공연을 찾을 수 없습니다.");
  }
  // mock에선 noop
}

export async function mockDeleteConcert(id: number): Promise<void> {
  await mockDelay(500);
  // mock에선 noop
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
    artist: concert!.artist,
    genre: concert!.genre,
    venue: concert!.venue,
    address: "서울특별시 서초구 남부순환로 2406",
    date: concert!.date,
    time: concert!.time,
    price: concert!.price,
    duration: 120,
    description: "공연 설명...",
    posterUrl: concert!.posterUrl,
    facilities: [],
    notices: [],
  };
}
