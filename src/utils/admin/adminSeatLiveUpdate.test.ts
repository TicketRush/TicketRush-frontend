import { describe, expect, it } from "vitest";
import {
  isAdminSoldDetailPending,
  resolveAdminDetailViewStatus,
  resolveSelectedSeatLiveUpdate,
} from "./adminSeatLiveUpdate";

describe("resolveAdminDetailViewStatus", () => {
  it("맵 상태가 있으면 상세보다 맵을 우선한다", () => {
    expect(resolveAdminDetailViewStatus("SOLD", "HOLD")).toBe("SOLD");
    expect(resolveAdminDetailViewStatus(undefined, "HOLD")).toBe("HOLD");
  });
});

describe("isAdminSoldDetailPending", () => {
  it("맵이 SOLD이고 상세가 HOLD일 때만 갱신 중이다", () => {
    expect(isAdminSoldDetailPending("SOLD", "HOLD")).toBe(true);
    expect(isAdminSoldDetailPending("SOLD", "SOLD")).toBe(false);
    expect(isAdminSoldDetailPending("HOLD", "HOLD")).toBe(false);
    expect(isAdminSoldDetailPending(undefined, "HOLD")).toBe(false);
  });
});

describe("resolveSelectedSeatLiveUpdate", () => {
  it("선점이 풀리면 선택을 해제한다", () => {
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 2,
        selectedStatus: "AVAILABLE",
        prevSeatId: 2,
        prevStatus: "HOLD",
      }),
    ).toBe("clear");
  });

  it("같은 좌석이 HOLD에서 SOLD로 바뀌면 상세를 다시 받는다", () => {
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 2,
        selectedStatus: "SOLD",
        prevSeatId: 2,
        prevStatus: "HOLD",
      }),
    ).toBe("refetch");
  });

  it("처음 고르거나 다른 좌석으로 바꾸면 맵 재조회를 하지 않는다", () => {
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 2,
        selectedStatus: "HOLD",
        prevSeatId: null,
        prevStatus: undefined,
      }),
    ).toBe("keep");
    expect(
      resolveSelectedSeatLiveUpdate({
        selectedSeatId: 3,
        selectedStatus: "SOLD",
        prevSeatId: 2,
        prevStatus: "HOLD",
      }),
    ).toBe("keep");
  });
});
