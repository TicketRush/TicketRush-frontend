import { describe, expect, it } from "vitest";
import type { AdminConcertItem } from "@/types/domain/admin";
import {
  formatAdminConcertGenre,
  formatAdminConcertId,
  getAdminConcertStatusLabel,
  getAdminConcertStatusView,
  getAdminOccupancyClass,
  isAdminConcertRowActionTarget,
  isAdminConcertSoldOut,
} from "./adminConcertRow";

type AdminConcertStatusSource = Pick<
  AdminConcertItem,
  "status" | "soldOut" | "soldSeats" | "totalSeats"
>;

const base: AdminConcertStatusSource = {
  status: "ON_SALE",
  soldOut: false,
  soldSeats: 10,
  totalSeats: 20,
};

describe("isAdminConcertSoldOut", () => {
  it("soldOut 플래그가 있으면 매진이다", () => {
    expect(isAdminConcertSoldOut({ ...base, soldOut: true })).toBe(true);
  });

  it("판매 좌석이 총 좌석 이상이면 매진이다", () => {
    expect(
      isAdminConcertSoldOut({ ...base, soldSeats: 20, totalSeats: 20 }),
    ).toBe(true);
    expect(
      isAdminConcertSoldOut({ ...base, soldSeats: 21, totalSeats: 20 }),
    ).toBe(true);
  });

  it("총 좌석이 0이거나 좌석 수가 없으면 매진이 아니다", () => {
    expect(
      isAdminConcertSoldOut({ ...base, soldSeats: 0, totalSeats: 0 }),
    ).toBe(false);
    expect(
      isAdminConcertSoldOut({
        ...base,
        soldSeats: undefined,
        totalSeats: undefined,
      }),
    ).toBe(false);
  });
});

describe("getAdminConcertStatusLabel", () => {
  it("취소는 매진보다 우선한다", () => {
    expect(
      getAdminConcertStatusLabel({
        ...base,
        status: "CANCELED",
        soldOut: true,
        soldSeats: 20,
        totalSeats: 20,
      }),
    ).toBe("취소");
  });

  it("매진은 판매 상태보다 우선한다", () => {
    expect(getAdminConcertStatusLabel({ ...base, soldOut: true })).toBe("매진");
    expect(
      getAdminConcertStatusLabel({
        ...base,
        status: "UPCOMING",
        soldSeats: 20,
        totalSeats: 20,
      }),
    ).toBe("매진");
  });

  it("매진이 아니면 상태 enum 라벨을 쓴다", () => {
    expect(getAdminConcertStatusLabel(base)).toBe("판매중");
    expect(
      getAdminConcertStatusLabel({ ...base, status: "UPCOMING" }),
    ).toBe("예정");
    expect(getAdminConcertStatusLabel({ ...base, status: "CLOSED" })).toBe(
      "종료",
    );
  });
});

describe("getAdminConcertStatusView", () => {
  it("대시보드는 옅은 뱃지고 예정은 파란색이다", () => {
    expect(
      getAdminConcertStatusView({ ...base, status: "UPCOMING" }, "dashboard"),
    ).toEqual({
      label: "예정",
      className: "px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700",
    });
    expect(getAdminConcertStatusView(base, "dashboard").className).toContain(
      "bg-green-100 text-green-700",
    );
  });

  it("모니터링은 흰 글자 뱃지고 예정은 회색이다", () => {
    expect(
      getAdminConcertStatusView({ ...base, status: "UPCOMING" }, "monitoring"),
    ).toEqual({
      label: "예정",
      className: "px-3 py-1 rounded-md text-xs font-bold text-white",
      backgroundColor: "#6B7280",
    });
    expect(
      getAdminConcertStatusView(base, "monitoring").backgroundColor,
    ).toBe("#00C950");
    expect(
      getAdminConcertStatusView(
        { ...base, soldOut: true },
        "monitoring",
      ).backgroundColor,
    ).toBe("#FB2C36");
  });
});

describe("formatAdminConcertId / genre", () => {
  it("ID를 E001 형식으로 맞춘다", () => {
    expect(formatAdminConcertId(1)).toBe("E001");
    expect(formatAdminConcertId(12)).toBe("E012");
  });

  it("장르는 genreName이 있으면 그걸 쓰고 없으면 장르 라벨이다", () => {
    expect(
      formatAdminConcertGenre({ genre: "CONCERT", genreName: "콘서트(한)" }),
    ).toBe("콘서트(한)");
    expect(formatAdminConcertGenre({ genre: "MUSICAL" })).toBe("뮤지컬");
  });
});

describe("getAdminOccupancyClass", () => {
  it("대시보드는 90 / 50 기준이다", () => {
    expect(getAdminOccupancyClass(undefined, "dashboard")).toBe("text-gray-400");
    expect(getAdminOccupancyClass(0.9, "dashboard")).toBe("text-green-600");
    expect(getAdminOccupancyClass(0.5, "dashboard")).toBe("text-blue-600");
    expect(getAdminOccupancyClass(0.49, "dashboard")).toBe("text-gray-500");
  });

  it("모니터링은 100 / 80 기준이다", () => {
    expect(getAdminOccupancyClass(undefined, "monitoring")).toBe(
      "text-admin-text-secondary",
    );
    expect(getAdminOccupancyClass(1, "monitoring")).toBe("text-[#00C950]");
    expect(getAdminOccupancyClass(0.9, "monitoring")).toBe("text-[#1D7DFF]");
    expect(getAdminOccupancyClass(0.8, "monitoring")).toBe("text-[#1D7DFF]");
    expect(getAdminOccupancyClass(0.5, "monitoring")).toBe("text-admin-text");
  });
});

describe("isAdminConcertRowActionTarget", () => {
  it("버튼이나 링크 안이면 행 클릭으로 보지 않는다", () => {
    expect(
      isAdminConcertRowActionTarget({ closest: () => ({ tagName: "BUTTON" }) }),
    ).toBe(true);
    expect(isAdminConcertRowActionTarget({ closest: () => null })).toBe(false);
    expect(isAdminConcertRowActionTarget(null)).toBe(false);
  });
});
