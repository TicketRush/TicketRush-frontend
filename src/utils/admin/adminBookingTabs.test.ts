import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@/types/domain/booking";
import {
  ADMIN_BOOKING_LIST_TABS,
  adminBookingTabLabel,
  adminBookingTabStatuses,
  matchesAdminBookingTab,
} from "./adminBookingTabs";

const STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELED",
  "REFUNDING",
  "REFUNDED",
  "EXPIRED",
];

describe("adminBookingTabStatuses (#337/#339)", () => {
  it("전체 탭은 취소·만료를 빼고 네 상태를 조회한다", () => {
    expect(adminBookingTabStatuses("ALL")).toEqual([
      "CONFIRMED",
      "PENDING",
      "REFUNDING",
      "REFUNDED",
    ]);
    expect(STATUSES.filter((s) => matchesAdminBookingTab(s, "ALL"))).toEqual([
      "PENDING",
      "CONFIRMED",
      "REFUNDING",
      "REFUNDED",
    ]);
  });

  it("완료 탭은 CONFIRMED만", () => {
    expect(adminBookingTabStatuses("CONFIRMED")).toEqual(["CONFIRMED"]);
  });

  it("대기·환불 중 탭은 PENDING과 REFUNDING", () => {
    expect(adminBookingTabStatuses("PENDING")).toEqual([
      "PENDING",
      "REFUNDING",
    ]);
  });

  it("환불 완료 탭은 REFUNDED만", () => {
    expect(adminBookingTabStatuses("REFUNDED")).toEqual(["REFUNDED"]);
    expect(matchesAdminBookingTab("CANCELED", "REFUNDED")).toBe(false);
  });
});

describe("adminBookingTabLabel", () => {
  it("탭 라벨을 표시한다", () => {
    expect(ADMIN_BOOKING_LIST_TABS).toEqual([
      "ALL",
      "CONFIRMED",
      "PENDING",
      "REFUNDED",
    ]);
    expect(adminBookingTabLabel("REFUNDED")).toBe("환불 완료");
    expect(adminBookingTabLabel("PENDING")).toBe("대기·환불 중");
  });
});
