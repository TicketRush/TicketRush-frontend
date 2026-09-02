import { describe, expect, it } from "vitest";
import {
  isPendingBookingFlowPath,
  shouldKeepPendingOnPath,
} from "./isPendingBookingFlowPath";

describe("isPendingBookingFlowPath", () => {
  it("확인·결제·결제실패는 true다", () => {
    expect(isPendingBookingFlowPath("/concerts/1/payment/confirm")).toBe(true);
    expect(isPendingBookingFlowPath("/concerts/12/payment")).toBe(true);
    expect(isPendingBookingFlowPath("/concerts/12/payment/failed")).toBe(true);
  });

  it("성공·만료·좌석·홈은 false다", () => {
    expect(isPendingBookingFlowPath("/concerts/1/payment/success")).toBe(
      false,
    );
    expect(isPendingBookingFlowPath("/concerts/1/payment/expired")).toBe(
      false,
    );
    expect(isPendingBookingFlowPath("/concerts/1/seats")).toBe(false);
    expect(isPendingBookingFlowPath("/")).toBe(false);
  });
});

describe("shouldKeepPendingOnPath", () => {
  it("확인·결제·실패·성공·만료·좌석은 유지한다", () => {
    expect(shouldKeepPendingOnPath("/concerts/1/payment/confirm")).toBe(true);
    expect(shouldKeepPendingOnPath("/concerts/1/payment")).toBe(true);
    expect(shouldKeepPendingOnPath("/concerts/1/payment/failed")).toBe(true);
    expect(shouldKeepPendingOnPath("/concerts/1/payment/success")).toBe(true);
    expect(shouldKeepPendingOnPath("/concerts/1/payment/expired")).toBe(true);
    expect(shouldKeepPendingOnPath("/concerts/1/seats")).toBe(true);
  });

  it("로그인·가입·OAuth 콜백은 유지한다", () => {
    expect(shouldKeepPendingOnPath("/login")).toBe(true);
    expect(shouldKeepPendingOnPath("/signup")).toBe(true);
    expect(shouldKeepPendingOnPath("/oauth/callback/kakao")).toBe(true);
  });

  it("홈·상세·마이페이지는 이탈로 본다", () => {
    expect(shouldKeepPendingOnPath("/")).toBe(false);
    expect(shouldKeepPendingOnPath("/concerts")).toBe(false);
    expect(shouldKeepPendingOnPath("/concerts/1")).toBe(false);
    expect(shouldKeepPendingOnPath("/reservations/mypage")).toBe(false);
  });
});
