import { describe, expect, it } from "vitest";
import {
  pickResumablePending,
  type ServerPendingBooking,
} from "./pickResumablePending";

const now = Date.parse("2026-09-26T00:00:00Z");

function item(
  overrides: Partial<ServerPendingBooking> = {},
): ServerPendingBooking {
  return {
    bookingId: 1,
    bookingNumber: "A",
    performanceId: 12,
    performanceTitle: "봄 콘서트",
    performanceVenue: "홀",
    performanceDate: "2026-10-01",
    seatId: 4,
    seatNumber: "A-1",
    price: 10000,
    expiresAt: "2026-09-26T00:04:00Z",
    ...overrides,
  };
}

describe("pickResumablePending", () => {
  it("마감이 남은 건 중 가장 가까운 것을 고른다", () => {
    const picked = pickResumablePending(
      [
        item({ bookingNumber: "LATER", expiresAt: "2026-09-26T00:10:00Z" }),
        item({ bookingNumber: "SOON", expiresAt: "2026-09-26T00:02:00Z" }),
      ],
      now,
    );
    expect(picked?.bookingNumber).toBe("SOON");
  });

  it("만료·가격 없음·좌석 없음은 제외한다", () => {
    expect(
      pickResumablePending(
        [
          item({ expiresAt: "2026-09-25T23:00:00Z" }),
          item({ price: undefined }),
          item({ seatNumber: " " }),
          item({ expiresAt: null }),
        ],
        now,
      ),
    ).toBeNull();
  });
});
