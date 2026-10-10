import { GENRE_MAP } from "@/constants/genre";
import type { AdminConcertItem } from "@/types/domain/admin";
import type { ConcertStatus } from "@/types/domain/concert";

export type AdminConcertListVariant = "dashboard" | "monitoring";

export type AdminConcertStatusLabel =
  | "판매중"
  | "매진"
  | "예정"
  | "종료"
  | "취소";

const CONCERT_STATUS_LABEL: Record<ConcertStatus, AdminConcertStatusLabel> = {
  UPCOMING: "예정",
  ON_SALE: "판매중",
  CLOSED: "종료",
  CANCELED: "취소",
};

const DASHBOARD_STATUS_CLASS: Record<AdminConcertStatusLabel, string> = {
  판매중: "bg-green-100 text-green-700",
  매진: "bg-red-100 text-red-700",
  예정: "bg-blue-100 text-blue-700",
  종료: "bg-gray-100 text-gray-600",
  취소: "bg-red-100 text-red-700",
};

const MONITORING_STATUS_COLOR: Record<AdminConcertStatusLabel, string> = {
  판매중: "#00C950",
  매진: "#FB2C36",
  예정: "#6B7280",
  종료: "#6B7280",
  취소: "#FB2C36",
};

type AdminConcertStatusSource = Pick<
  AdminConcertItem,
  "status" | "soldOut" | "soldSeats" | "totalSeats"
>;

type AdminConcertGenreSource = Pick<AdminConcertItem, "genre" | "genreName">;

type ClosestTarget = {
  closest?: (selector: string) => unknown;
};

/** 매진은 상태 enum이 아니다. soldOut이거나, 총 좌석이 있고 판매 수가 그 이상일 때. */
export function isAdminConcertSoldOut(row: AdminConcertStatusSource): boolean {
  if (row.soldOut === true) return true;
  return (
    row.totalSeats != null &&
    row.soldSeats != null &&
    row.totalSeats > 0 &&
    row.soldSeats >= row.totalSeats
  );
}

/** 취소, 매진, 그다음 판매 상태. */
export function getAdminConcertStatusLabel(
  row: AdminConcertStatusSource,
): AdminConcertStatusLabel {
  if (row.status === "CANCELED") return "취소";
  if (isAdminConcertSoldOut(row)) return "매진";
  return CONCERT_STATUS_LABEL[row.status] ?? "판매중";
}

export function getAdminConcertStatusView(
  row: AdminConcertStatusSource,
  variant: AdminConcertListVariant,
): {
  label: AdminConcertStatusLabel;
  className: string;
  backgroundColor?: string;
} {
  const label = getAdminConcertStatusLabel(row);
  if (variant === "dashboard") {
    return {
      label,
      className: `px-2 py-1 rounded text-xs font-semibold ${DASHBOARD_STATUS_CLASS[label]}`,
    };
  }
  return {
    label,
    className: "px-3 py-1 rounded-md text-xs font-bold text-white",
    backgroundColor: MONITORING_STATUS_COLOR[label],
  };
}

export function formatAdminConcertId(id: number): string {
  return `E${String(id).padStart(3, "0")}`;
}

export function formatAdminConcertGenre(row: AdminConcertGenreSource): string {
  return row.genreName ?? GENRE_MAP[row.genre]?.label ?? row.genre;
}

/** 점유율 색. 기준은 화면마다 다르다. 대시보드 90/50, 모니터링 100/80. */
export function getAdminOccupancyClass(
  rate: number | null | undefined,
  variant: AdminConcertListVariant,
): string {
  if (rate == null) {
    return variant === "dashboard"
      ? "text-gray-400"
      : "text-admin-text-secondary";
  }
  const pct = rate * 100;
  if (variant === "dashboard") {
    if (pct >= 90) return "text-green-600";
    if (pct >= 50) return "text-blue-600";
    return "text-gray-500";
  }
  if (pct >= 100) return "text-[#00C950]";
  if (pct >= 80) return "text-[#1D7DFF]";
  return "text-admin-text";
}

/** 수정·삭제·링크 클릭은 행 선택으로 올라가지 않는다. */
export function isAdminConcertRowActionTarget(target: unknown): boolean {
  const node = target as ClosestTarget | null;
  if (node == null || typeof node.closest !== "function") return false;
  return node.closest("button, a") != null;
}
