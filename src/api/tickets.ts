// 입장권 API — 백엔드 ticket-service swagger (2026-07-07) 스펙 반영
//
// 백엔드 endpoint 매핑:
//   getTicketQr → GET /api/v1/ticket/bookings/{bookingId}/qr

import type { TicketQrResponse } from "@/types/domain/ticket";
import { mockGetTicketQr } from "./mocks/tickets";
import apiClient from "./instance";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// 입장권 QR payload 조회.

// payload(JWT)는 발급 후 5분간만 유효
// useTicketQr가 4분마다 자동 재요청해 만료 전에 새 payload로 갱신

export async function getTicketQr(
  bookingId: number,
): Promise<TicketQrResponse> {
  if (USE_MOCK) return mockGetTicketQr(bookingId);
  const res = await apiClient.get<TicketQrResponse>(
    `/api/v1/ticket/bookings/${bookingId}/qr`,
  );
  return res.data;
}
