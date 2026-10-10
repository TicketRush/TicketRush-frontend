// 관리자 목록 칸 정렬 (#372)
//
// 텍스트는 왼쪽, 수량·금액은 오른쪽, 날짜·상태·버튼은 가운데.
// 수량·금액만 tabular-nums와 줄바꿈 방지를 붙인다.

export type AdminTableAlign = "text" | "numeric" | "center";

const TEXT_ALIGN: Record<AdminTableAlign, string> = {
  text: "text-left",
  numeric: "text-right",
  center: "text-center",
};

export function adminTableAlignClass(
  align: AdminTableAlign,
  options?: { nowrap?: boolean },
): string {
  const parts = [TEXT_ALIGN[align]];
  if (align === "numeric") {
    parts.push("tabular-nums", "whitespace-nowrap");
  } else if (options?.nowrap) {
    parts.push("whitespace-nowrap");
  }
  return parts.join(" ");
}
