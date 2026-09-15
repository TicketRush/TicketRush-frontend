// 예매 취소 mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBookingApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingNumber: string) => cancelBookingApi(bookingNumber),
    onSuccess: (_, bookingNumber) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(bookingNumber),
      });
      // 마이페이지 취소 후에도 좌석 HOLD 통계가 남지 않게 (#260)
      void queryClient.invalidateQueries({ queryKey: queryKeys.seats.all });
    },
  });
}
