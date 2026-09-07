// Mock 입장권 QR — 백엔드 ticket-service swagger (2026-07-07) 스펙 반영
//
// GET /api/v1/ticket/bookings/{bookingId}/qr

import { mockDelay } from "./_helpers";
import type { TicketQrResponse } from "@/types/domain/ticket";

const QR_TTL_MS = 5 * 60 * 1000;

function encodeSegment(payload: Record<string, unknown>): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 실 백엔드 payload(JWT)와 형태만 흡사한 mock 서명 문자열 생성 */
function generateMockPayload(bookingId: number, issuedAt: string): string {
  const header = encodeSegment({ alg: "HS256", typ: "JWT" });
  const body = encodeSegment({
    bookingId,
    iat: issuedAt,
    exp: new Date(Date.parse(issuedAt) + QR_TTL_MS).toISOString(),
  });
  const signature = Math.random().toString(36).slice(2, 24);
  return `${header}.${body}.${signature}`;
}

export async function mockGetTicketQr(
  bookingId: number,
): Promise<TicketQrResponse> {
  await mockDelay(300);

  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + QR_TTL_MS).toISOString();

  return {
    payload: generateMockPayload(bookingId, issuedAt),
    ticketStatus: "UNUSED",
    issuedAt,
    expiresAt,
  };
}
