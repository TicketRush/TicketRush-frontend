import { describe, expect, it } from "vitest";
import {
  ApiError,
  isIgnorablePendingCancelError,
  isUnauthorizedError,
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

describe("isUnauthorizedError", () => {
  it("COMMON_401을 인증 만료로 본다", () => {
    expect(isUnauthorizedError(api(ERROR_CODES.UNAUTHORIZED, 401))).toBe(true);
  });

  it("인터셉터가 만든 AUTH_UNAUTHORIZED도 인증 만료로 본다", () => {
    expect(isUnauthorizedError(api("AUTH_UNAUTHORIZED", 403))).toBe(true);
  });

  it("AUTH_401_* 도 인증 만료로 본다", () => {
    expect(isUnauthorizedError(api(ERROR_CODES.AUTH_EXPIRED_TOKEN, 401))).toBe(
      true,
    );
  });

  it("권한 부족은 인증 만료가 아니다", () => {
    expect(isUnauthorizedError(api(ERROR_CODES.AUTH_ACCESS_DENIED, 403))).toBe(
      false,
    );
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

  it("환불 마감 409는 백엔드 문구를 그대로 쓴다", () => {
    const backend = "공연 7일 전까지만 환불할 수 있습니다.";
    expect(
      mapErrorToMessage(ERROR_CODES.BOOKING_REFUND_DEADLINE_PASSED, backend),
    ).toBe(backend);
    expect(
      mapErrorToMessage(
        ERROR_CODES.PAYMENT_CANCEL_NOT_ALLOWED_REFUND_DEADLINE,
        backend,
      ),
    ).toBe(backend);
  });

  it("공연 정보 조회 실패 503은 재시도 안내로 덮어쓴다", () => {
    expect(
      mapErrorToMessage(
        ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED,
        "공연 정보 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      ),
    ).toBe(
      "공연 정보를 확인하지 못해 환불할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("환불 기한·처리 실패는 결제 코드 안내를 쓴다", () => {
    expect(
      mapErrorToMessage(ERROR_CODES.PAYMENT_REFUND_DEADLINE_EXCEEDED, "be"),
    ).toBe("환불 가능 기간이 지났습니다.");
    expect(mapErrorToMessage(ERROR_CODES.PAYMENT_REFUND_FAILED, "be")).toBe(
      "환불 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
    );
  });
});
