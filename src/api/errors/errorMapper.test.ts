import { describe, expect, it } from "vitest";
import { ApiError, isIgnorablePendingCancelError } from "./errorMapper";
import { ERROR_CODES } from "./errorCodes";

function api(code: string, httpStatus?: number) {
  return new ApiError(
    { isSuccess: false, code, message: "x", result: null },
    httpStatus,
  );
}

describe("isIgnorablePendingCancelError", () => {
  it("404는 무시한다", () => {
    expect(isIgnorablePendingCancelError(api("ANY", 404))).toBe(true);
  });

  it("이미 만료·취소된 PENDING DELETE(BOOKING_409_001)는 무시한다", () => {
    expect(
      isIgnorablePendingCancelError(
        api(ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED, 409),
      ),
    ).toBe(true);
  });

  it("BOOKING_EXPIRED는 무시한다", () => {
    expect(
      isIgnorablePendingCancelError(api(ERROR_CODES.BOOKING_EXPIRED, 409)),
    ).toBe(true);
  });

  it("네트워크 오류는 무시하지 않는다", () => {
    expect(isIgnorablePendingCancelError(api("NETWORK_ERROR"))).toBe(false);
  });
});
