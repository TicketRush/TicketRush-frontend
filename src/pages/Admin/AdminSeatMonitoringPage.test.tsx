import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminSeatMonitoringPage, {
  AdminSeatMonitoringMap,
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
  concertTitle: vi.fn(),
  stream: vi.fn(),
}));

vi.mock("@/hooks/admin/useAdmin", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/hooks/admin/useAdmin")>();
  return {
    ...actual,
    useAdminConcerts: mocks.concerts,
    useAdminSeatMonitoring: mocks.monitoring,
    useAdminSeatDetail: mocks.detail,
    useAdminReleaseSeat: mocks.release,
    useAdminConcertTitle: mocks.concertTitle,
  };
});
vi.mock("@/hooks/queries/useSeats", () => ({
  useSeatCounts: mocks.counts,
}));
vi.mock("@/hooks/seat/useSeatEventStream", () => ({
  useSeatEventStream: mocks.stream,
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
  mocks.concertTitle.mockReturnValue({
    data: "테스트 공연",
    isFetched: true,
    isError: false,
  });
  mocks.stream.mockReturnValue({ connectionStatus: "live" });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/seat-monitoring"
          element={<AdminSeatMonitoringPage />}
        />
        <Route
          path="/admin/seat-monitoring/:performanceId"
          element={<AdminSeatMonitoringPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderList() {
  return renderAt("/admin/seat-monitoring");
}

function renderMap() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <AdminSeatMonitoringMap
        performanceId={12}
        concertTitle={concert.title}
        onChangeConcert={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("AdminSeatMonitoringPage live updates (#336 / #361)", () => {
  it("공연 목록의 ID·장르·날짜·판매 지표는 가운데, 공연명은 왼쪽 정렬이다", () => {
    const html = renderList();
    expect(html).toContain(">ID</th>");
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">ID<\/th>/,
    );
    expect(html).toMatch(/<th class="py-3 px-3 text-left">공연명<\/th>/);
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">장르<\/th>/,
    );
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">날짜<\/th>/,
    );
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">판매\/총<\/th>/,
    );
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">점유율<\/th>/,
    );
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">매출<\/th>/,
    );
    expect(html).toMatch(
      /<th class="py-3 px-3 text-center whitespace-nowrap">상태<\/th>/,
    );
    expect(html).toContain("text-left font-bold");
    expect(html).toContain("overflow-x-auto");
  });

  it("공연 목록에서는 SSE를 열지 않는다", () => {
    const html = renderList();
    expect(html).toContain("전체 공연 목록");
    expect(html).toContain("테스트 공연");
    expect(useSeatEventStream).not.toHaveBeenCalled();
  });

  it("목록으로 돌아오면 판매/점유율을 항상 다시 받는다", () => {
    renderList();
    expect(mocks.concerts).toHaveBeenCalledWith(
      { page: 0, size: 50 },
      { refetchOnMount: "always" },
    );
  });

  it("목록 ?page= 는 화면에 보이는 번호이고 첫 페이지는 0으로 연다", () => {
    renderAt("/admin/seat-monitoring?page=2");
    expect(mocks.concerts).toHaveBeenCalledWith(
      { page: 1, size: 50 },
      { refetchOnMount: "always" },
    );

    mocks.concerts.mockClear();
    renderAt("/admin/seat-monitoring?page=1");
    expect(mocks.concerts).toHaveBeenCalledWith(
      { page: 0, size: 50 },
      { refetchOnMount: "always" },
    );

    mocks.concerts.mockClear();
    renderAt("/admin/seat-monitoring?page=abc");
    expect(mocks.concerts).toHaveBeenCalledWith(
      { page: 0, size: 50 },
      { refetchOnMount: "always" },
    );
  });

  it("잘못된 공연 ID면 맵 SSE를 열지 않는다", () => {
    const html = renderAt("/admin/seat-monitoring/abc");
    expect(html).not.toContain("새로고침");
    expect(useSeatEventStream).not.toHaveBeenCalled();
  });

  it("목록 state 제목이 있으면 관리자 제목 조회를 열지 않는다", () => {
    mocks.concertTitle.mockReturnValue({
      data: undefined,
      isFetched: false,
      isError: false,
    });
    const html = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/admin/seat-monitoring/12",
            state: { concert },
          },
        ]}
      >
        <Routes>
          <Route
            path="/admin/seat-monitoring/:performanceId"
            element={<AdminSeatMonitoringPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toContain('value="테스트 공연"');
    expect(mocks.concertTitle).toHaveBeenCalledWith(12, { enabled: false });
  });

  it("목록 state에 제목이 없어도 맵이 깨지지 않고 관리자 제목을 조회한다", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/admin/seat-monitoring/12",
            state: { concert: { ...concert, title: undefined } },
          },
        ]}
      >
        <Routes>
          <Route
            path="/admin/seat-monitoring/:performanceId"
            element={<AdminSeatMonitoringPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toContain('value="테스트 공연"');
    expect(mocks.concertTitle).toHaveBeenCalledWith(12, { enabled: true });
  });

  it("새로고침처럼 state가 없어도 관리자 공연 제목을 보여 준다", () => {
    const html = renderAt("/admin/seat-monitoring/12");
    expect(html).toContain('value="테스트 공연"');
    expect(mocks.concertTitle).toHaveBeenCalledWith(12, { enabled: true });
  });

  it("관리자 제목을 못 찾으면 공연 ID로 채우고, 조회 중에는 비워 둔다", () => {
    mocks.concertTitle.mockReturnValue({
      data: null,
      isFetched: true,
      isError: true,
    });
    expect(renderAt("/admin/seat-monitoring/12")).toContain('value="공연 12"');

    mocks.concertTitle.mockReturnValue({
      data: undefined,
      isFetched: false,
      isError: false,
    });
    expect(renderAt("/admin/seat-monitoring/12")).toContain('value=""');
  });

  it("맵 URL이면 같은 공연 맵을 열고 SSE로 관리자 맵 캐시를 패치한다", () => {
    const html = renderAt("/admin/seat-monitoring/12");
    expect(html).toContain("새로고침");
    expect(html).toContain("테스트 공연");
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
  });

  it("SSE LIVE와 폴링 상태를 화면에 구분한다", () => {
    const live = renderMap();
    expect(live).toContain("LIVE");
    expect(live).not.toContain("폴링 중");

    mocks.stream.mockReturnValue({ connectionStatus: "polling" });
    const polling = renderMap();
    expect(polling).toContain("폴링 중");
    expect(polling).not.toContain("LIVE");

    mocks.stream.mockReturnValue({ connectionStatus: "reconnecting" });
    expect(renderMap()).toContain("재연결 중");

    mocks.stream.mockReturnValue({ connectionStatus: "connecting" });
    expect(renderMap()).toContain("연결 중");
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
