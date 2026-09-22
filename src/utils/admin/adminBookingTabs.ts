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

export const ADMIN_BOOKING_TABS_HINT =
  "환불 완료 탭은 환불이 끝난 예매만 보여 줍니다. 전체 탭 건수는 KPI「전체 예매」와 다를 수 있습니다(결제 전 취소·만료 제외). KPI「취소된 예매」는 미결제 취소+환불 완료라 [환불 완료] 탭과도 다릅니다. 환불 전용 집계는 환불 관리 화면(BE #675 / FE #397)을 씁니다.";
