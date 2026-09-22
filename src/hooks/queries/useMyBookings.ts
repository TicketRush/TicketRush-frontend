import { useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMyBookings } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import { withVisibleMyBookings } from "@/utils/booking";
import {
  MY_BOOKINGS_MAX_PAGES,
  MY_BOOKINGS_PAGE_SIZE,
  flattenMyBookingPages,
  myBookingsHasMore,
  myBookingsPagesStalled,
  nextMyBookingsPageParam,
} from "@/utils/booking/myBookingsPages";
import { overlayMyBookingsResponse } from "@/utils/booking/userRefund";
import { useMyBookingCount } from "./useMyBookingCount";

/** 내 예매 목록. 상태별 다음 페이지를 기존 목록 뒤에 붙인다 (#339/#380). */
export function useMyBookings(options: { size?: number } = {}) {
  const size = Math.min(options.size ?? MY_BOOKINGS_PAGE_SIZE, MY_BOOKINGS_PAGE_SIZE);
  const countQuery = useMyBookingCount();
  const totalCount = countQuery.data?.count;
  const totalCountRef = useRef(totalCount);
  totalCountRef.current = totalCount;

  const query = useInfiniteQuery({
    queryKey: queryKeys.bookings.mine({ size }),
    queryFn: ({ pageParam }) =>
      fetchMyBookings({
        size,
        page: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      nextMyBookingsPageParam(lastPage, allPages, {
        maxPages: MY_BOOKINGS_MAX_PAGES,
        totalCount: totalCountRef.current,
      }),
    select: (data) => ({
      ...data,
      pages: data.pages.map((page) =>
        withVisibleMyBookings(overlayMyBookingsResponse(page)),
      ),
    }),
    staleTime: 30_000,
  });

  const items = useMemo(
    () => flattenMyBookingPages(query.data?.pages),
    [query.data?.pages],
  );
  const stalled = myBookingsPagesStalled(query.data?.pages);
  const hasMore = myBookingsHasMore({
    hasNextPage: query.hasNextPage ?? false,
    loadedCount: items.length,
    totalCount,
    stalled,
  });

  return {
    items,
    totalCount,
    isCountError: countQuery.isError,
    isLoading: query.isPending || (query.isFetching && !query.data),
    isError: query.isError && !query.data,
    hasMore,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
