import { describe, expect, it } from "vitest";
import {
  filterAdminRefundList,
  formatAdminRefundPerformance,
  summarizeAdminRefunds,
} from "./adminRefunds";

describe("admin refunds (#397)", () => {
  const rows = [
    { refundStatus: "IN_PROGRESS" as const, id: 1 },
    { refundStatus: "COMPLETED" as const, id: 2 },
    { refundStatus: "COMPLETED" as const, id: 3 },
    { refundStatus: "FAILED" as const, id: 4 },
  ];

  it("통계는 필터와 따로 전체 모집단을 센다", () => {
    expect(summarizeAdminRefunds(rows)).toEqual({
      totalRefunds: 4,
      inProgressRefunds: 1,
      completedRefunds: 2,
      failedRefunds: 1,
    });
    expect(filterAdminRefundList(rows, "FAILED").map((row) => row.id)).toEqual([
      4,
    ]);
    expect(summarizeAdminRefunds(rows).totalRefunds).toBe(4);
  });

  it("실패 이력이 있어도 현재 상태가 완료면 완료로 남긴다", () => {
    expect(
      summarizeAdminRefunds([{ refundStatus: "COMPLETED" }]),
    ).toMatchObject({ completedRefunds: 1, failedRefunds: 0, totalRefunds: 1 });
  });

  it("공연 일시는 벽시계 그대로 붙인다", () => {
    expect(formatAdminRefundPerformance("2026-05-22", "19:30:00")).toBe(
      "2026-05-22 19:30",
    );
    expect(formatAdminRefundPerformance(null, "19:30:00")).toBe("-");
  });
});
