// 예매 생성 mutation
import { useMutation } from "@tanstack/react-query";
import { createBookingApi } from "@/api/bookings";
import type { BookingCreateRequest } from "@/types/domain/booking";

export function useCreateBooking() {
  return useMutation({
    mutationFn: (req: BookingCreateRequest) => createBookingApi(req),
  });
}
