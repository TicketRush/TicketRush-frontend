// 예매 생성 mutation
//
// 백엔드: POST /api/v1/booking
// 좌석 HOLD를 겸함 (실 API 연동 시 useHoldSeat 대체 예정)
import { useMutation } from "@tanstack/react-query";
import { createBookingApi } from "@/api/bookings";
import type { BookingPendingRequest } from "@/types/domain/booking";

export function useCreateBooking() {
  return useMutation({
    mutationFn: (req: BookingPendingRequest) => createBookingApi(req),
  });
}
