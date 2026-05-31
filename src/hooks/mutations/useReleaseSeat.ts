// 좌석 해제 mutation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { releaseSeat } from "@/api/seats";
import { queryKeys } from "@/constants/queryKeys";
import type { SeatWithStatus } from "@/types/domain/seat";

export function useReleaseSeat(performanceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seatId: number) => releaseSeat(performanceId, seatId),
    onSuccess: (_, seatId) => {
      queryClient.setQueryData<SeatWithStatus[]>(
        queryKeys.seats.byPerformance(performanceId),
        (old) =>
          old?.map((s) =>
            s.id === seatId ? { ...s, status: "AVAILABLE" } : s,
          ),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.seats.counts(performanceId),
      });
    },
  });
}
