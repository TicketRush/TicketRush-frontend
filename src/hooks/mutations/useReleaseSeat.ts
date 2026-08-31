// 좌석 해제 mutation
//
// ⚠️ 아키텍처 변경
// 백엔드에 별도 좌석 RELEASE API 없음. 예매 취소(DELETE /booking/{bookingNumber})가
// 좌석 해제를 겸함.
//
// 인터페이스 변경:
//   기존: mutationFn(seatId: number)
//   변경: mutationFn(bookingNumber: string) — 예매 취소 방식
//
// ⚠️ 사용처 조정 필요:
//   - SeatSelectionPage 및 lifecycle 훅에서 seatId 대신 bookingNumber 전달해야 함
//   - useCreateBooking 성공 시 받은 bookingNumber를 상위에서 보관 후
//     여기 넘겨주는 흐름 필요
//
// onSuccess 시 좌석 캐시 patch를 위해 별도 seatId도 함께 전달할 수 있게 확장 옵션 추가.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBookingApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";
import type { SeatWithStatus } from "@/types/domain/seat";

interface ReleaseSeatVariables {
  bookingNumber: string;
  /** 좌석 캐시 patch를 위해 함께 전달 (없으면 캐시 patch 스킵) */
  seatId?: number;
}

export function useReleaseSeat(performanceId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReleaseSeatVariables>({
    mutationFn: ({ bookingNumber }) => cancelBookingApi(bookingNumber),
    onSuccess: (_, { seatId }) => {
      if (seatId !== undefined) {
        queryClient.setQueryData<SeatWithStatus[]>(
          queryKeys.seats.byPerformance(performanceId),
          (old) =>
            old?.map((s) =>
              s.id === seatId ? { ...s, status: "AVAILABLE" } : s,
            ),
        );
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.seats.counts(performanceId),
      });
    },
  });
}
