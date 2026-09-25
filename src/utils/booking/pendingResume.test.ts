import { describe, expect, it } from "vitest";
import type { PaymentStatus } from "@/types/domain/payment";
import {
  isResumablePaymentStatus,
  pendingResumePath,
  shouldExpirePendingOffFlow,
  shouldShowPendingResumeBanner,
} from "./pendingResume";

const visible = {
  bookingNumber: "X7B29-KLPW1",
  paymentStatus: "IDLE" as const,
  timerStatus: "running" as const,
  performanceId: 12,
  hasSelectedSeat: true,
  pathname: "/",
};

describe("isResumablePaymentStatus", () => {
  it("IDLE·FAILED만 이어갈 수 있다", () => {
    const resumable: PaymentStatus[] = ["IDLE", "FAILED"];
    const blocked: PaymentStatus[] = [
      "REQUESTING",
      "CONFIRMING",
      "SUCCESS",
      "EXPIRED",
      "CANCELLED",
    ];
    for (const status of resumable) {
      expect(isResumablePaymentStatus(status)).toBe(true);
    }
    for (const status of blocked) {
      expect(isResumablePaymentStatus(status)).toBe(false);
    }
  });
});

describe("pendingResumePath", () => {
  it("실패 건은 결제실패 화면으로, 그 외는 예매 확인으로 보낸다", () => {
    expect(pendingResumePath(12, "FAILED")).toBe("/concerts/12/payment/failed");
    expect(pendingResumePath(12, "IDLE")).toBe("/concerts/12/payment/confirm");
  });
});

describe("shouldExpirePendingOffFlow", () => {
  it("홈·상세·마이페이지는 레이아웃이 만료 취소를 한다", () => {
    expect(shouldExpirePendingOffFlow("/")).toBe(true);
    expect(shouldExpirePendingOffFlow("/concerts/1")).toBe(true);
    expect(shouldExpirePendingOffFlow("/reservations/mypage")).toBe(true);
  });

  it("확인·결제·좌석·만료 화면은 해당 페이지가 처리한다", () => {
    expect(shouldExpirePendingOffFlow("/concerts/1/payment/confirm")).toBe(
      false,
    );
    expect(shouldExpirePendingOffFlow("/concerts/1/payment")).toBe(false);
    expect(shouldExpirePendingOffFlow("/concerts/1/seats")).toBe(false);
    expect(shouldExpirePendingOffFlow("/concerts/1/payment/expired")).toBe(
      false,
    );
  });
});

describe("shouldShowPendingResumeBanner", () => {
  it("플로우 밖에서 HOLD·타이머가 남아 있으면 보여 준다", () => {
    expect(shouldShowPendingResumeBanner(visible)).toBe(true);
    expect(
      shouldShowPendingResumeBanner({
        ...visible,
        paymentStatus: "FAILED",
        pathname: "/reservations/mypage",
      }),
    ).toBe(true);
  });

  it("타이머가 없거나 만료되면 보여 주지 않는다", () => {
    expect(
      shouldShowPendingResumeBanner({ ...visible, timerStatus: "idle" }),
    ).toBe(false);
    expect(
      shouldShowPendingResumeBanner({ ...visible, timerStatus: "expired" }),
    ).toBe(false);
  });

  it("마감 시각 조회가 실패하면 타이머가 없어도 보여 준다", () => {
    expect(
      shouldShowPendingResumeBanner({
        ...visible,
        timerStatus: "idle",
        timerUnconfirmed: true,
      }),
    ).toBe(true);
  });

  it("확인·결제 화면과 좌석 재진입에서는 숨긴다", () => {
    expect(
      shouldShowPendingResumeBanner({
        ...visible,
        pathname: "/concerts/12/payment/confirm",
      }),
    ).toBe(false);
    expect(
      shouldShowPendingResumeBanner({
        ...visible,
        pathname: "/concerts/12/seats",
      }),
    ).toBe(false);
  });

  it("결제 중이거나 예매 컨텍스트가 없으면 숨긴다", () => {
    expect(
      shouldShowPendingResumeBanner({ ...visible, bookingNumber: null }),
    ).toBe(false);
    expect(
      shouldShowPendingResumeBanner({
        ...visible,
        paymentStatus: "REQUESTING",
      }),
    ).toBe(false);
    expect(
      shouldShowPendingResumeBanner({ ...visible, performanceId: 0 }),
    ).toBe(false);
    expect(
      shouldShowPendingResumeBanner({ ...visible, hasSelectedSeat: false }),
    ).toBe(false);
  });

  it("결제 실패 복귀는 좌석 정보가 없어도 보여 준다", () => {
    expect(
      shouldShowPendingResumeBanner({
        ...visible,
        paymentStatus: "FAILED",
        hasSelectedSeat: false,
      }),
    ).toBe(true);
  });
});
