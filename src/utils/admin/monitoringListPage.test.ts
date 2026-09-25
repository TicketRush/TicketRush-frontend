import { describe, expect, it } from "vitest";
import {
  clampedMonitoringListPage,
  monitoringListPath,
  parseMonitoringListPage,
  readMonitoringListPage,
} from "./monitoringListPage";

describe("monitoringListPage", () => {
  it("없거나 1 이하거나 잘못된 값은 첫 페이지다", () => {
    expect(parseMonitoringListPage(null)).toBe(0);
    expect(parseMonitoringListPage(undefined)).toBe(0);
    expect(parseMonitoringListPage("")).toBe(0);
    expect(parseMonitoringListPage("0")).toBe(0);
    expect(parseMonitoringListPage("1")).toBe(0);
    expect(parseMonitoringListPage("-1")).toBe(0);
    expect(parseMonitoringListPage("1.5")).toBe(0);
    expect(parseMonitoringListPage("abc")).toBe(0);
    expect(parseMonitoringListPage("2")).toBe(1);
  });

  it("첫 페이지 주소는 쿼리를 생략하고, 보이는 번호를 붙인다", () => {
    expect(monitoringListPath(0)).toBe("/admin/seat-monitoring");
    expect(monitoringListPath(-3)).toBe("/admin/seat-monitoring");
    expect(monitoringListPath(1)).toBe("/admin/seat-monitoring?page=2");
  });

  it("맵으로 넘긴 목록 페이지만 돌아온다", () => {
    expect(readMonitoringListPage(null)).toBe(0);
    expect(readMonitoringListPage({ concert: { id: 1 } })).toBe(0);
    expect(readMonitoringListPage({ listPage: 2 })).toBe(2);
    expect(readMonitoringListPage({ listPage: "2" })).toBe(0);
    expect(readMonitoringListPage({ listPage: -1 })).toBe(0);
  });

  it("전체 페이지를 넘는 번호만 마지막 페이지로 맞춘다", () => {
    expect(clampedMonitoringListPage(0, 3)).toBeNull();
    expect(clampedMonitoringListPage(2, 3)).toBeNull();
    expect(clampedMonitoringListPage(5, 3)).toBe(2);
    expect(clampedMonitoringListPage(1, 0)).toBe(0);
    expect(clampedMonitoringListPage(1, undefined)).toBeNull();
  });
});
