// 좌석 선점 mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { holdSeat } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import type { SeatWithStatus } from "@/types/domain/seat";

export function useHoldSeat(performanceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seatId: number) => holdSeat(performanceId, seatId),
    onSuccess: (data) => {
      // 캐시 patch (낙관적 X — 백엔드 성공 후 반영)
      queryClient.setQueryData<SeatWithStatus[]>(
        queryKeys.seats.byPerformance(performanceId),
        (old) =>
          old?.map((s) =>
            s.id === data.seatId ? { ...s, status: "HOLD" } : s,
          ),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.seats.counts(performanceId),
      });
    },
  });
}
