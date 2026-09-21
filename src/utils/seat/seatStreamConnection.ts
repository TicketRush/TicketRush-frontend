// SSE 연결/폴링 fallback 상태 (#361)
export type SeatStreamConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "polling";

export type SeatStreamConnectionEvent = "start" | "open" | "error" | "poll";

export const SEAT_STREAM_CONNECTION_LABEL: Record<
  SeatStreamConnectionStatus,
  string
> = {
  connecting: "연결 중",
  live: "LIVE",
  reconnecting: "재연결 중",
  polling: "폴링 중",
};

/** EventSource onerror는 폴링 중에도 반복되므로, 폴링이면 폴링을 유지한다. */
export function reduceSeatStreamConnection(
  current: SeatStreamConnectionStatus,
  event: SeatStreamConnectionEvent,
): SeatStreamConnectionStatus {
  switch (event) {
    case "start":
      return "connecting";
    case "open":
      return "live";
    case "error":
      return current === "polling" ? "polling" : "reconnecting";
    case "poll":
      return "polling";
  }
}
