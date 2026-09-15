// 좌석 해제 mutation
//
// 백엔드에 별도 좌석 RELEASE API 없음. 예매 취소(DELETE /booking/{bookingNumber})가
// 좌석 해제를 겸함.
//
// #167: cancel 200이어도 좌석 반납은 best-effort. AVAILABLE로 캐시를 낙관 갱신하지 않고
// seat-layouts / seat-counts를 무효화해 재조회한다.
// #260: 이미 만료/취소(ignorable)여도 counts를 다시 맞춰 「진행중」 잔상을 줄인다.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBookingApi } from "@/api/bookings";
import { queryKeys } from "@/constants/queryKeys";

interface ReleaseSeatVariables {
  bookingNumber: string;
  /** 호출부 호환용. 캐시 patch에는 쓰지 않음. */
  seatId?: number;
}

function invalidateAfterRelease(
  queryClient: ReturnType<typeof useQueryClient>,
  performanceId: number,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
  if (performanceId > 0) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.seats.byPerformance(performanceId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.seats.counts(performanceId),
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: queryKeys.seats.all });
  }
}

export function useReleaseSeat(performanceId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReleaseSeatVariables>({
    mutationFn: ({ bookingNumber }) => cancelBookingApi(bookingNumber),
    onSettled: () => {
      invalidateAfterRelease(queryClient, performanceId);
    },
  });
}
