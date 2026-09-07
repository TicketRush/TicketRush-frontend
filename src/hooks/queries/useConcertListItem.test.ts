import { describe, expect, it } from "vitest";
import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import type {
  ConcertListParams,
  ConcertListResponse,
  ConcertSummary,
} from "@/types/domain/concert";
import { findConcertInListCache } from "./useConcertListItem";

function summary(
  id: number,
  seats?: { totalSeats: number; remainingSeats: number },
): ConcertSummary {
  return {
    id,
    title: `concert-${id}`,
    performer: "performer",
    genre: "CONCERT",
    address: "서울",
    showDate: "2026-09-01",
    showTime: "19:00",
    price: 10000,
    imageMainUrl: "",
    status: "ON_SALE",
    ...seats,
  };
}

function page(
  items: ConcertSummary[],
  hasNext: boolean,
  nextCursor: number,
): ConcertListResponse {
  return {
    items,
    pagination: { hasNext, nextCursor, size: 8 },
  };
}

function seedListCache(
  queryClient: QueryClient,
  pages: ConcertListResponse[],
  params: ConcertListParams = { size: 8 },
) {
  const data: InfiniteData<ConcertListResponse> = {
    pages,
    pageParams: pages.map((_, i) => i * 8),
  };
  queryClient.setQueryData(queryKeys.concerts.list(params), data);
}

describe("findConcertInListCache", () => {
  it("2페이지 공연도 찾는다", () => {
    const queryClient = new QueryClient();
    seedListCache(queryClient, [
      page([summary(1, { totalSeats: 120, remainingSeats: 23 })], true, 8),
      page([summary(13, { totalSeats: 100, remainingSeats: 10 })], false, 16),
    ]);

    expect(findConcertInListCache(queryClient, 13)?.remainingSeats).toBe(10);
    expect(findConcertInListCache(queryClient, 1)?.remainingSeats).toBe(23);
  });

  it("캐시에 없으면 undefined다", () => {
    const queryClient = new QueryClient();
    seedListCache(queryClient, [
      page([summary(1, { totalSeats: 120, remainingSeats: 23 })], false, 8),
    ]);

    expect(findConcertInListCache(queryClient, 13)).toBeUndefined();
    expect(findConcertInListCache(queryClient, undefined)).toBeUndefined();
  });

  it("pages가 없는 캐시 항목에서 던지지 않는다", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.concerts.list({ size: 8 }), {});

    expect(findConcertInListCache(queryClient, 1)).toBeUndefined();
  });

  it("동일 id면 좌석 수가 있는 캐시를 우선한다", () => {
    const queryClient = new QueryClient();

    seedListCache(queryClient, [page([summary(1)], false, 8)], { size: 8 });
    seedListCache(
      queryClient,
      [page([summary(1, { totalSeats: 120, remainingSeats: 23 })], false, 8)],
      { size: 8, genre: "CONCERT" },
    );

    expect(findConcertInListCache(queryClient, 1)?.remainingSeats).toBe(23);
  });

  it("좌석 수가 있는 캐시가 없으면 처음 찾은 항목을 반환한다", () => {
    const queryClient = new QueryClient();
    seedListCache(queryClient, [page([summary(1)], false, 8)], { size: 8 });

    expect(findConcertInListCache(queryClient, 1)).toEqual(summary(1));
  });
});
