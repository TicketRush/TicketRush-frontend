import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@/types/domain/booking";
import {
  ADMIN_BOOKING_LIST_TABS,
  adminBookingServerFilterApplied,
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

describe("adminBookingServerFilterApplied", () => {
  it("행에 탭 밖 상태가 있으면 서버가 안 거른 것이다", () => {
    expect(
      adminBookingServerFilterApplied(
        ["REFUNDED"],
        [{ status: "CONFIRMED" }],
        10,
        10,
      ),
    ).toBe(false);
  });

  it("거른 건수와 전체 건수가 같으면 서버가 안 거른 것이다", () => {
    expect(
      adminBookingServerFilterApplied(
        ["REFUNDED"],
        [{ status: "REFUNDED" }],
        10,
        10,
      ),
    ).toBe(false);
  });

  it("거른 건수가 전체보다 작으면 서버 필터를 쓴다", () => {
    expect(
      adminBookingServerFilterApplied(
        ["REFUNDED"],
        [{ status: "REFUNDED" }],
        2,
        10,
      ),
    ).toBe(true);
  });
});
