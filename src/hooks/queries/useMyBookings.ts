// 내 예매 목록 — cursor 기반 infinite scroll
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMyBookings } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import type { MyBookingsParams } from "@/types/domain/booking";

export function useMyBookings(params: Omit<MyBookingsParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.bookings.mine(params),
    queryFn: ({ pageParam }) =>
      fetchMyBookings({ ...params, cursor: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.pagination.hasNext ? last.pagination.nextCursor : undefined,
    staleTime: 30_000,
  });
}
