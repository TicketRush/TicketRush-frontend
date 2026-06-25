// 예매 상세 조회
import { useQuery } from "@tanstack/react-query";
import { fetchBookingDetail } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";

export function useBookingDetail(bookingNumber: string | undefined) {
  return useQuery({
    queryKey: bookingNumber
      ? queryKeys.bookings.detail(bookingNumber)
      : ["booking", "invalid"],
    queryFn: () => fetchBookingDetail(bookingNumber!),
    enabled: !!bookingNumber,
  });
}
