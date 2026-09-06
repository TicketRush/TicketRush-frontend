import { describe, expect, it } from "vitest";
import { mapAdminConcert, mapAdminDashboard } from "./adminDashboardMapper";

describe("mapAdminDashboard", () => {
  it("등록 공연 수는 항상 매핑하고 생략된 집계는 undefined로 둔다", () => {
    const mapped = mapAdminDashboard({ registeredPerformances: 42 });

    expect(mapped.stats.totalConcerts).toBe(42);
    expect(mapped.stats.soldTickets).toBeUndefined();
    expect(mapped.stats.totalRevenue).toBeUndefined();
    expect(mapped.stats.averageOccupancyRate).toBeUndefined();
    expect(mapped.dailyRevenue).toBeUndefined();
    expect(mapped.genreRevenue).toBeUndefined();
  });

  it("일별·장르 매출을 화면 타입으로 옮기고 장르 비율을 계산한다", () => {
    const mapped = mapAdminDashboard({
      registeredPerformances: 2,
      soldTickets: 10,
      totalRevenue: 300,
      dailyRevenues: [{ date: "2026-08-07", revenue: 100 }],
      genreRevenues: [
        { genre: "MUSICAL", genreName: "뮤지컬", revenue: 200 },
        { genre: "CONCERT", genreName: "콘서트", revenue: 100 },
      ],
    });

    expect(mapped.dailyRevenue).toEqual([
      { date: "2026-08-07", revenue: 100 },
    ]);
    expect(mapped.genreRevenue?.[0]?.genre).toBe("MUSICAL");
    expect(mapped.genreRevenue?.[0]?.label).toBe("뮤지컬");
    expect(mapped.genreRevenue?.[0]?.revenue).toBe(200);
    expect(mapped.genreRevenue?.[0]?.percentage).toBeCloseTo(200 / 3, 5);
  });
});

describe("mapAdminConcert", () => {
  it("집계 필드가 없어도 공연 행을 만든다", () => {
    const mapped = mapAdminConcert({
      performanceId: 12,
      title: "팬텀",
      genre: "MUSICAL",
      showDate: "2026-09-01",
      performanceStatus: "ON_SALE",
    });

    expect(mapped).toEqual({
      id: 12,
      title: "팬텀",
      genre: "MUSICAL",
      genreName: undefined,
      date: "2026-09-01",
      showTime: undefined,
      soldSeats: undefined,
      totalSeats: undefined,
      occupancyRate: undefined,
      revenue: undefined,
      soldOut: undefined,
      status: "ON_SALE",
    });
  });
});
