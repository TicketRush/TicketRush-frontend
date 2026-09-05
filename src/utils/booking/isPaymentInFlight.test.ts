import { describe, expect, it } from "vitest";
import {
  CONFIRMING_LEAVE_MESSAGE,
  REQUESTING_LEAVE_MESSAGE,
  isPaymentInFlight,
  paymentInFlightLeaveMessage,
} from "./isPaymentInFlight";
import type { PaymentStatus } from "@/types/domain/payment";

const idleStatuses: PaymentStatus[] = [
  "IDLE",
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
];

describe("isPaymentInFlight", () => {
  it("REQUESTING·CONFIRMING만 true다", () => {
    expect(isPaymentInFlight("REQUESTING")).toBe(true);
    expect(isPaymentInFlight("CONFIRMING")).toBe(true);
    for (const status of idleStatuses) {
      expect(isPaymentInFlight(status)).toBe(false);
    }
  });
});

describe("paymentInFlightLeaveMessage", () => {
  it("상태별 안내 문구를 반환한다", () => {
    expect(paymentInFlightLeaveMessage("REQUESTING")).toBe(
      REQUESTING_LEAVE_MESSAGE,
    );
    expect(paymentInFlightLeaveMessage("CONFIRMING")).toBe(
      CONFIRMING_LEAVE_MESSAGE,
    );
  });
});
