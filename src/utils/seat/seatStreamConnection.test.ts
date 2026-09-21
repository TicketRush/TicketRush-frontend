import { describe, expect, it } from "vitest";
import {
  reduceSeatStreamConnection,
  SEAT_STREAM_CONNECTION_LABEL,
  type SeatStreamConnectionStatus,
} from "./seatStreamConnection";

describe("reduceSeatStreamConnection", () => {
  it("open이면 LIVE, error면 재연결 중, poll이면 폴링 중이다", () => {
    expect(reduceSeatStreamConnection("connecting", "open")).toBe("live");
    expect(reduceSeatStreamConnection("live", "error")).toBe("reconnecting");
    expect(reduceSeatStreamConnection("reconnecting", "poll")).toBe("polling");
    expect(reduceSeatStreamConnection("polling", "open")).toBe("live");
  });

  it("폴링 중에 SSE error가 나도 폴링을 유지한다", () => {
    expect(reduceSeatStreamConnection("polling", "error")).toBe("polling");
  });

  it("화면 라벨이 SSE와 폴링을 구분한다", () => {
    const labels: Record<SeatStreamConnectionStatus, string> = {
      connecting: SEAT_STREAM_CONNECTION_LABEL.connecting,
      live: SEAT_STREAM_CONNECTION_LABEL.live,
      reconnecting: SEAT_STREAM_CONNECTION_LABEL.reconnecting,
      polling: SEAT_STREAM_CONNECTION_LABEL.polling,
    };
    expect(labels.live).toBe("LIVE");
    expect(labels.reconnecting).toBe("재연결 중");
    expect(labels.polling).toBe("폴링 중");
    expect(new Set(Object.values(labels)).size).toBe(4);
  });
});
