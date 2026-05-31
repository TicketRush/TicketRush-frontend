// 예매 취소 mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBookingApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingNumber: string) => cancelBookingApi(bookingNumber),
    onSuccess: (_, bookingNumber) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(bookingNumber),
      });
    },
  });
}
