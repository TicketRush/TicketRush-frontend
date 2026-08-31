// 예매 생성 mutation
//
// 백엔드: POST /api/v1/booking
// 좌석 HOLD를 겸함 (별도 좌석 HOLD API 없음. useHoldSeat는 폐기, 이 훅으로 대체됨 — 이슈 #124)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBookingApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import type { BookingPendingRequest } from "@/types/domain/booking";

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: BookingPendingRequest) => createBookingApi(req),
    onSuccess: (_data, req) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.seats.byPerformance(req.performanceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.seats.counts(req.performanceId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
