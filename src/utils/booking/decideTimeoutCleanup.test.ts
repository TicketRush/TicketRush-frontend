import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/errors/errorMapper";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import { shouldResetStoresAfterTimeoutRelease } from "./decideTimeoutCleanup";

function api(code: string, httpStatus?: number) {
  return new ApiError(
    { isSuccess: false, code, message: "x", result: null },
    httpStatus,
  );
}

describe("shouldResetStoresAfterTimeoutRelease", () => {
  it("해제 성공이면 store를 비운다", () => {
    expect(shouldResetStoresAfterTimeoutRelease(null)).toBe(true);
    expect(shouldResetStoresAfterTimeoutRelease(undefined)).toBe(true);
  });

  it("이미 만료·취소·없음이면 store를 비운다", () => {
    expect(shouldResetStoresAfterTimeoutRelease(api("ANY", 404))).toBe(true);
    expect(
      shouldResetStoresAfterTimeoutRelease(
        api(ERROR_CODES.BOOKING_EXPIRED, 409),
      ),
    ).toBe(true);
    expect(
      shouldResetStoresAfterTimeoutRelease(
        api(ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED, 409),
      ),
    ).toBe(true);
  });

  it("네트워크·5xx면 bookingNumber를 유지한다", () => {
    expect(shouldResetStoresAfterTimeoutRelease(api("NETWORK_ERROR"))).toBe(
      false,
    );
    expect(
      shouldResetStoresAfterTimeoutRelease(api("INTERNAL_ERROR", 500)),
    ).toBe(false);
  });
});
