import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import AdminSeatMonitoringPage, {
  AdminSeatMonitoringMap,
  resolveSelectedSeatLiveUpdate,
} from "./AdminSeatMonitoringPage";
import { useSeatEventStream } from "@/hooks/seat/useSeatEventStream";
import { adminKeys } from "@/hooks/admin/useAdmin";
import type { AdminConcertItem } from "@/types/domain/admin";
import type { SeatMapData } from "@/types/domain/seat";

const mocks = vi.hoisted(() => ({
  concerts: vi.fn(),
  monitoring: vi.fn(),
  counts: vi.fn(),
  detail: vi.fn(),
  release: vi.fn(),
}));

vi.mock("@/hooks/admin/useAdmin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/admin/useAdmin")>();
  return {
    ...actual,
    useAdminConcerts: mocks.concerts,
    useAdminSeatMonitoring: mocks.monitoring,
    useAdminSeatDetail: mocks.detail,
    useAdminReleaseSeat: mocks.release,
  };
});
vi.mock("@/hooks/queries/useSeats", () => ({
  useSeatCounts: mocks.counts,
}));
vi.mock("@/hooks/seat/useSeatEventStream", () => ({
  useSeatEventStream: vi.fn(),
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

const concert: AdminConcertItem = {
  id: 12,
  title: "테스트 공연",
  genre: "CONCERT",
  date: "2027-01-01",
  showTime: "19:30:00",
  soldSeats: 2,
  totalSeats: 4,
  occupancyRate: 0.5,
  revenue: 20000,
  status: "ON_SALE",
};

const seatMap: SeatMapData = {
  layout: { totalRows: 1, maxCols: 2 },
  layoutReady: true,
  seats: [
    {
      id: 1,
      seatLayoutId: 1,
      seatNumber: "A-1",
      row: "A",
      col: 1,
      status: "AVAILABLE",
    },
    {
      id: 2,
      seatLayoutId: 1,
      seatNumber: "A-2",
      row: "A",
      col: 2,
      status: "HOLD",
    },
  ],
};

const readyMonitoringQuery = {
  data: seatMap,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  isFetching: false,
  isFetchedAfterMount: true,
};

const readyCountsQuery = {
  data: {
    totalCount: 4,
    availableCount: 1,
    holdCount: 2,
    soldCount: 1,
  },
  isError: false,
  refetch: vi.fn(),
  isFetching: false,
};

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  mocks.concerts.mockReturnValue({
    data: { items: [concert] },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
  });
  mocks.monitoring.mockReturnValue(readyMonitoringQuery);
  mocks.counts.mockReturnValue(readyCountsQuery);
  mocks.detail.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.release.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderList() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AdminSeatMonitoringPage />
    </MemoryRouter>,
  );
}

function renderMap() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AdminSeatMonitoringMap performanceId={12} concert={concert} onChangeConcert={() => {}} />
    </MemoryRouter>,
  );
}

describe("AdminSeatMonitoringPage live updates (#336)", () => {
  it("공연 목록에서는 SSE를 열지 않는다", () => {
    const html = renderList();
    expect(html).toContain("전체 공연 목록");
    expect(html).toContain("테스트 공연");
    expect(useSeatEventStream).not.toHaveBeenCalled();
  });

  it("맵 화면에서 공개 SSE로 관리자 맵 캐시를 패치한다", () => {
    const html = renderMap();
    expect(html).toContain("새로고침");
    expect(html).toContain("좌석 A-1 AVAILABLE");
    expect(html).toContain("좌석 A-2 HOLD");
    expect(useSeatEventStream).toHaveBeenCalledWith(
      12,
      true,
      expect.objectContaining({
        syncUserSelection: false,
        getMapQueryKey: adminKeys.seatMonitoring,
      }),
    );
    expect(adminKeys.seatMonitoring(12)).toEqual([
      "admin",
      "seat-monitoring",
      12,
    ]);
  });

  it("백그라운드 재조회 중에도 맵과 숫자를 유지하고 새로고침 버튼은 돌리지 않는다", () => {
    mocks.monitoring.mockReturnValue({
      ...readyMonitoringQuery,
      isFetching: true,
      isFetchedAfterMount: true,
    });
    mocks.counts.mockReturnValue({
      ...readyCountsQuery,
      isFetching: true,
    });

    const html = renderMap();
    expect(html).not.toContain("좌석 정보 불러오는 중...");
    expect(html).not.toContain("animate-spin");
    expect(html).toContain("좌석 A-2 HOLD");
    expect(html).toContain("판매 완료");
    expect(html).toContain("임시 예매 (타이머)");
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
  });

  it("맵 데이터가 없는 최초 조회만 로딩으로 보여 준다", () => {
    mocks.monitoring.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
      isFetching: true,
      isFetchedAfterMount: false,
    });
    mocks.counts.mockReturnValue({
      ...readyCountsQuery,
      data: undefined,
      isFetching: true,
    });

    const html = renderMap();
    expect(html).toContain("좌석 정보 불러오는 중...");
    expect(html).not.toContain("좌석 A-1 AVAILABLE");
  });
});

describe("resolveSelectedSeatLiveUpdate", () => {
  it("선점이 풀리면 선택을 해제한다", () => {
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 2,
        selectedStatus: "AVAILABLE",
        prevSeatId: 2,
        prevStatus: "HOLD",
      }),
    ).toBe("clear");
  });

  it("같은 좌석이 HOLD에서 SOLD로 바뀌면 상세를 다시 받는다", () => {
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 2,
        selectedStatus: "SOLD",
        prevSeatId: 2,
        prevStatus: "HOLD",
      }),
    ).toBe("refetch");
  });

  it("처음 고르거나 다른 좌석으로 바꾸면 맵 재조회를 하지 않는다", () => {
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 2,
        selectedStatus: "HOLD",
        prevSeatId: null,
        prevStatus: undefined,
      }),
    ).toBe("keep");
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 3,
        selectedStatus: "SOLD",
        prevSeatId: 2,
        prevStatus: "HOLD",
      }),
    ).toBe("keep");
  });
});
