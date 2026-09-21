import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SeatSelectionPage from "./SeatSelectionPage";
import type { ConcertDetail } from "@/types/domain/concert";
import type { SeatMapData } from "@/types/domain/seat";

const mocks = vi.hoisted(() => ({
  concertDetail: vi.fn(),
  seatCounts: vi.fn(),
  seats: vi.fn(),
}));

vi.mock("@/hooks/queries/useConcertDetail", () => ({
  useConcertDetail: mocks.concertDetail,
}));
vi.mock("@/hooks/queries/useSeats", () => ({
  useSeats: mocks.seats,
  useSeatCounts: mocks.seatCounts,
}));
vi.mock("@/hooks/seat/useSeatEventStream", () => ({
  useSeatEventStream: vi.fn(),
}));
vi.mock("@/hooks/mutations/useCreateBooking", () => ({
  useCreateBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/mutations/useReleaseSeat", () => ({
  useReleaseSeat: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/booking/useCancelPendingReservation", () => ({
  useCancelPendingReservation: () => vi.fn(),
}));
vi.mock("@/hooks/common/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

const concert: ConcertDetail = {
  id: 1,
  title: "테스트 공연",
  performer: "출연진",
  genre: "CONCERT",
  showDate: "2027-01-01",
  showTime: "19:30",
  durationMinutes: 90,
  price: 10000,
  totalSeats: 4,
  status: "ON_SALE",
  address: "서울",
  description: "소개",
  facilities: [],
  imageMainUrl: "/poster.png",
  imageGalleryUrls: [],
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

const readyConcertQuery = {
  data: concert,
  isLoading: false,
  isFetching: false,
  isFetchedAfterMount: true,
  isError: false,
};

const readyCountsQuery = {
  data: {
    totalCount: 4,
    availableCount: 2,
    holdCount: 1,
    soldCount: 1,
  },
  isLoading: false,
  isFetching: false,
  isFetchedAfterMount: true,
  isError: false,
};

beforeEach(() => {
  vi.stubGlobal("React", React);
  mocks.concertDetail.mockReturnValue(readyConcertQuery);
  mocks.seatCounts.mockReturnValue(readyCountsQuery);
  mocks.seats.mockReturnValue({
    data: seatMap,
    isLoading: false,
    isError: false,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderPage() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/concerts/1/seats"]}>
      <Routes>
        <Route path="/concerts/:id/seats" element={<SeatSelectionPage />} />
        <Route path="/concerts/:id" element={<div>상세</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SeatSelectionPage live updates (#335)", () => {
  it("최초 fresh 조회 중에는 진입 가드를 보여 준다", () => {
    mocks.concertDetail.mockReturnValue({
      ...readyConcertQuery,
      isFetching: true,
      isFetchedAfterMount: false,
    });
    mocks.seatCounts.mockReturnValue({
      ...readyCountsQuery,
      isFetching: true,
      isFetchedAfterMount: false,
    });

    const html = renderPage();
    expect(html).toContain("예매 가능 여부를 확인하는 중...");
    expect(html).not.toContain("A-1");
  });

  it("백그라운드 refetch 중에도 좌석맵을 유지한다", () => {
    mocks.concertDetail.mockReturnValue({
      ...readyConcertQuery,
      isFetching: true,
      isFetchedAfterMount: true,
    });
    mocks.seatCounts.mockReturnValue({
      ...readyCountsQuery,
      isFetching: true,
      isFetchedAfterMount: true,
    });

    const html = renderPage();
    expect(html).not.toContain("예매 가능 여부를 확인하는 중...");
    expect(html).toContain("좌석 선택");
    expect(html).toContain("예매 가능");
    expect(html).toContain("임시예매");
  });

  it("처음부터 잔여 0이면 매진 안내 없이 좌석맵을 열지 않는다", () => {
    mocks.seatCounts.mockReturnValue({
      ...readyCountsQuery,
      data: { ...readyCountsQuery.data, availableCount: 0, holdCount: 2 },
    });

    const html = renderPage();
    expect(html).not.toContain("좌석 선택");
    expect(html).not.toContain("결제 대기");
    expect(html).not.toContain("이전 페이지로 이동합니다");
  });

  it("처음부터 판매 종료면 안내 모달 없이 좌석맵을 열지 않는다", () => {
    mocks.concertDetail.mockReturnValue({
      ...readyConcertQuery,
      data: { ...concert, status: "CLOSED" },
    });

    const html = renderPage();
    expect(html).not.toContain("좌석 선택");
    expect(html).not.toContain("예매가 마감되었습니다");
  });
});

describe("SeatSelectionPage zoom (#344)", () => {
  it("가로 스크롤 대신 줌 컨트롤을 보여 준다", () => {
    const html = renderPage();
    expect(html).toContain("좌석맵 확대 축소");
    expect(html).toContain("aria-label=\"확대\"");
    expect(html).toContain("aria-label=\"축소\"");
    expect(html).toContain("aria-label=\"전체 보기\"");
    expect(html).not.toContain("overflow-x-auto");
  });
});
