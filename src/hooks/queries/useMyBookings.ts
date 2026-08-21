import { useQuery } from "@tanstack/react-query";
import { fetchMyBookings } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import type { MyBookingsParams } from "@/types/domain/booking";

const DEFAULT_SIZE = 100;

export function useMyBookings(params: MyBookingsParams = {}) {
  const normalized: MyBookingsParams = {
    page: params.page ?? 0,
    size: params.size ?? DEFAULT_SIZE,
    ...(params.status ? { status: params.status } : {}),
  };

  return useQuery({
    queryKey: queryKeys.bookings.mine(normalized),
    queryFn: () => fetchMyBookings(normalized),
    staleTime: 30_000,
  });
}
