import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { LEGACY_HOLD_BOOKING_NUMBER } from "@/api/admin";
import {
  adminReleaseBookingNumber,
  resolveAdminSeatReleaseFailure,
} from "./adminSeatRelease";

describe("adminReleaseBookingNumber", () => {
  it("상세의 예매 번호를 그대로 보낸다", () => {
    expect(adminReleaseBookingNumber("BK-1")).toBe("BK-1");
  });

  it("번호가 없거나 공백이면 레거시 HOLD용 - 를 보낸다", () => {
    expect(adminReleaseBookingNumber(undefined)).toBe(LEGACY_HOLD_BOOKING_NUMBER);
    expect(adminReleaseBookingNumber("")).toBe(LEGACY_HOLD_BOOKING_NUMBER);
    expect(adminReleaseBookingNumber("  ")).toBe("-");
  });
});

describe("resolveAdminSeatReleaseFailure", () => {
  it("이미 해제된 좌석은 선택을 해제한다", () => {
    expect(
      resolveAdminSeatReleaseFailure(ERROR_CODES.SEAT_NOT_HELD, "BK-1"),
    ).toEqual({ kind: "clear-selection" });
  });

  it("판매 완료면 예매 번호가 있을 때만 환불로 넘긴다", () => {
    expect(
      resolveAdminSeatReleaseFailure(
        ERROR_CODES.SEAT_SOLD_NOT_RELEASABLE,
        "BK-1",
      ),
    ).toEqual({ kind: "open-refund", bookingNumber: "BK-1" });
    expect(
      resolveAdminSeatReleaseFailure(ERROR_CODES.SEAT_SOLD_NOT_RELEASABLE, "  "),
    ).toEqual({ kind: "open-refund", bookingNumber: undefined });
  });

  it("선점이 바뀌면 선택을 유지한다", () => {
    expect(
      resolveAdminSeatReleaseFailure(ERROR_CODES.SEAT_RELEASE_CONFLICT, "BK-1"),
    ).toEqual({ kind: "keep-selection" });
  });

  it("그 외 코드는 선택과 이동을 바꾸지 않는다", () => {
    expect(resolveAdminSeatReleaseFailure("SEAT_404_001", "BK-1")).toEqual({
      kind: "none",
    });
  });
});
