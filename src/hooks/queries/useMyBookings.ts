import { useQuery } from "@tanstack/react-query";
import { fetchMyBookings } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import type { MyBookingsParams } from "@/types/domain/booking";

const DEFAULT_SIZE = 100;

export function useMyBookings(params: MyBookingsParams = {}) {
  const { size = DEFAULT_SIZE } = params;

  return useQuery({
    queryKey: queryKeys.bookings.mine({ size }),
    queryFn: () => fetchMyBookings({ size }),
    staleTime: 30_000,
  });
}
