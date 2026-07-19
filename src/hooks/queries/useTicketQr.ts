// 입장권 QR payload 조회
//
// 백엔드 payload(JWT)는 발급 후 5분간만 유효하므로, 만료 전에 자동으로
// 재발급받도록 4분(만료 5분보다 1분 여유) 주기로 refetch한다.
import { useQuery } from "@tanstack/react-query";
import { getTicketQr } from "@/api/tickets";
import { queryKeys } from "@/constants/queryKeys";

const REFETCH_INTERVAL_MS = 4 * 60 * 1000;

export function useTicketQr(bookingId: number | undefined) {
  return useQuery({
    queryKey: bookingId
      ? queryKeys.tickets.qr(bookingId)
      : ["tickets", "qr", "invalid"],
    queryFn: () => getTicketQr(bookingId!),
    enabled: !!bookingId,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: 0,
  });
}
