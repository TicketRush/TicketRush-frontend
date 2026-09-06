import type {
  AdminConcertItem,
  AdminDashboardData,
  DailyRevenue,
  GenreRevenue,
} from "@/types/domain/admin";
import type { ConcertStatus, Genre } from "@/types/domain/concert";

/** GET /api/v1/performance/admin/dashboard — axios-case-converter 이후 */
export interface PerformanceAdminDashboardResponse {
  registeredPerformances: number;
  soldTickets?: number;
  totalRevenue?: number;
  revenueComplete?: boolean;
  missingAmountBookings?: number;
  averageOccupancyRate?: number;
  occupancySoldSeats?: number;
  occupancyTotalSeats?: number;
  dailyRevenues?: Array<{ date: string; revenue: number }>;
  genreRevenues?: Array<{
    genre: Genre;
    genreName: string;
    revenue: number;
  }>;
}

/** GET /api/v1/performance/admin — axios-case-converter 이후 */
export interface PerformanceAdminSummaryResponse {
  performanceId: number;
  title: string;
  genre: Genre;
  genreName?: string;
  showDate: string;
  showTime?: string;
  performanceStatus: ConcertStatus;
  soldSeats?: number;
  totalSeats?: number;
  occupancyRate?: number;
  soldOut?: boolean;
  revenue?: number;
}

export function mapAdminDashboard(
  data: PerformanceAdminDashboardResponse,
): AdminDashboardData {
  return {
    stats: {
      totalConcerts: data.registeredPerformances,
      soldTickets: data.soldTickets,
      totalRevenue: data.totalRevenue,
      averageOccupancyRate: data.averageOccupancyRate,
      revenueComplete: data.revenueComplete,
      missingAmountBookings: data.missingAmountBookings,
    },
    dailyRevenue:
      data.dailyRevenues == null
        ? undefined
        : data.dailyRevenues.map(mapDailyRevenue),
    genreRevenue:
      data.genreRevenues == null
        ? undefined
        : mapGenreRevenues(data.genreRevenues),
  };
}

function mapDailyRevenue(row: {
  date: string;
  revenue: number;
}): DailyRevenue {
  return { date: row.date, revenue: row.revenue };
}

export function mapGenreRevenues(
  rows: Array<{ genre: Genre; genreName: string; revenue: number }>,
): GenreRevenue[] {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  return rows.map((row) => ({
    genre: row.genre,
    label: row.genreName,
    revenue: row.revenue,
    percentage: total > 0 ? (row.revenue / total) * 100 : 0,
  }));
}

export function mapAdminConcert(
  row: PerformanceAdminSummaryResponse,
): AdminConcertItem {
  return {
    id: row.performanceId,
    title: row.title,
    genre: row.genre,
    genreName: row.genreName,
    date: row.showDate,
    showTime: row.showTime,
    soldSeats: row.soldSeats,
    totalSeats: row.totalSeats,
    occupancyRate: row.occupancyRate,
    revenue: row.revenue,
    soldOut: row.soldOut,
    status: row.performanceStatus,
  };
}
