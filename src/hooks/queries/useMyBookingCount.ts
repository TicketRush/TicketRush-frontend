import { useQuery } from "@tanstack/react-query";
import { countMyBookingsApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";

/** 내 예매에 노출하는 상태(CONFIRMED/REFUNDING/REFUNDED) 합계 (#339). */
export function useMyBookingCount() {
  return useQuery({
    queryKey: queryKeys.bookings.count(),
    queryFn: () => countMyBookingsApi(),
    staleTime: 30_000,
  });
}
