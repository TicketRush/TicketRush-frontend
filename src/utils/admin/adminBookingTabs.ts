import type { BookingStatus } from "@/types/domain/booking";

/** 관리자 예매 목록 탭. BE status 합집합 필터(#667/#674)로 페이지를 맞춘다. */
export type AdminBookingListTab =
  | "ALL"
  | "CONFIRMED"
  | "PENDING"
  | "REFUNDED";

export const ADMIN_BOOKING_LIST_TABS: readonly AdminBookingListTab[] = [
  "ALL",
  "CONFIRMED",
  "PENDING",
  "REFUNDED",
];

/**
 * 탭 → `?status=` 반복 파라미터 (#339 + BE #674).
 * - 전체: CANCELED·EXPIRED 제외 (FE가 상태를 명시; BE는 미지정 시 전체)
 * - 대기·환불 중: PENDING + REFUNDING
 * - 환불 완료: REFUNDED만
 */
export function adminBookingTabStatuses(
  tab: AdminBookingListTab,
): readonly BookingStatus[] {
  switch (tab) {
    case "ALL":
      return ["CONFIRMED", "PENDING", "REFUNDING", "REFUNDED"];
    case "CONFIRMED":
      return ["CONFIRMED"];
    case "PENDING":
      return ["PENDING", "REFUNDING"];
    case "REFUNDED":
      return ["REFUNDED"];
  }
}

/** 탭에 포함되는 상태인지 (Focus 숨김·테스트). 목록 조회는 서버 status를 쓴다. */
export function matchesAdminBookingTab(
  status: BookingStatus,
  tab: AdminBookingListTab,
): boolean {
  return adminBookingTabStatuses(tab).includes(status);
}

export function adminBookingTabLabel(tab: AdminBookingListTab): string {
  switch (tab) {
    case "ALL":
      return "전체";
    case "CONFIRMED":
      return "완료";
    case "PENDING":
      return "대기·환불 중";
    case "REFUNDED":
      return "환불 완료";
  }
}

/**
 * 실서버(main, 2026-09-17)는 status 파라미터를 무시하고 전체 목록을 준다.
 * 거른 건수와 안 거른 건수가 같거나, 행에 탭 밖 상태가 있으면 서버 필터가 안 먹은 것이다.
 */
export function adminBookingServerFilterApplied(
  requested: readonly BookingStatus[],
  items: readonly { status: BookingStatus }[],
  filteredTotal: number,
  unfilteredTotal: number,
): boolean {
  if (items.some((item) => !requested.includes(item.status))) return false;
  return filteredTotal !== unfilteredTotal;
}
