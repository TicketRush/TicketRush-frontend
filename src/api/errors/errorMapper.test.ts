import { describe, expect, it } from "vitest";
import {
  ApiError,
  isIgnorablePendingCancelError,
  mapErrorToMessage,
} from "./errorMapper";
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

describe("mapErrorToMessage", () => {
  it("비 CONFIRMED 취소·환불은 공통 안내를 쓴다", () => {
    expect(
      mapErrorToMessage(ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED, "be"),
    ).toBe("현재 상태에서는 취소하거나 환불할 수 없습니다.");
  });

  it("입장 완료 예매는 환불 불가로 안내한다", () => {
    expect(
      mapErrorToMessage(
        ERROR_CODES.BOOKING_CANCEL_NOT_ALLOWED_TICKET_USED,
        "be",
      ),
    ).toBe("이미 입장한 예매는 환불할 수 없습니다.");
  });
});
