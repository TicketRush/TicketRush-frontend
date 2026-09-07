// 입장권(Ticket) 도메인 타입
//
// 백엔드 ticket/entry-service swagger (2026-07-07) 스펙 반영
//
// 백엔드 endpoint:
//   GET /api/v1/ticket/bookings/{bookingId}/qr → TicketQrResponse

// 입장권 상태 — 백엔드 enum과 일치.
// - UNUSED: 미사용 (입장 전)
// - USED: 입장 완료
// - CANCELED: 취소됨 (예매 취소/환불에 연동)

export type TicketStatus = "UNUSED" | "USED" | "CANCELED";

// 백엔드 TicketQrResponse 대응.

// ⚠️ payload는 서명된 JWT 문자열 — QR 렌더링 시 그대로 value로 사용.
//   expiresAt(발급 + 5분) 이전에 재조회해 새 payload로 교체 필요

export interface TicketQrResponse {
  payload: string;
  ticketStatus: TicketStatus;
  issuedAt: string;
  expiresAt: string;
}
