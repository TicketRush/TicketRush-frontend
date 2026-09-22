import { useQuery } from "@tanstack/react-query";
import { fetchMyBookings } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import { withVisibleMyBookings } from "@/utils/booking";
import { overlayMyBookingsResponse } from "@/utils/booking/userRefund";
import { useMyBookingCount } from "./useMyBookingCount";

/** 화면 상한(#380). 요청당 BE max는 50이라 API 레이어가 status별 page를 이어 붙인다. */
const DEFAULT_SIZE = 100;

/** 내 예매 목록. status 없이 노출 상태만 받고, select에서 한 번 더 거른다 (#339). */
export function useMyBookings(options: { page?: number; size?: number } = {}) {
  const normalized = {
    page: options.page ?? 0,
    size: options.size ?? DEFAULT_SIZE,
  };
  const countQuery = useMyBookingCount();

  const query = useQuery({
    queryKey: queryKeys.bookings.mine(normalized),
    queryFn: () => fetchMyBookings(normalized),
    select: (data) => withVisibleMyBookings(overlayMyBookingsResponse(data)),
    staleTime: 30_000,
  });

  return {
    ...query,
    totalCount: countQuery.data?.count,
    isCountError: countQuery.isError,
  };
}
