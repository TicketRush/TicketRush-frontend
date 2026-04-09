// components/common/Badge/Badge.tsx
import { type ReactNode } from "react";

export type BadgeStatus =
  | "예매완료"
  | "결제중"
  | "취소"
  | "환불"
  | "매진"
  | "예매가능";

export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  status: BadgeStatus;
  size?: BadgeSize;
  /** status 자동 텍스트를 다른 텍스트로 오버라이드 (선택) */
  children?: ReactNode;
  /** Tailwind 클래스로 직접 색상/스타일 오버라이드 */
  className?: string;
}

// status별 라벨 + 색상 매핑
const statusConfig: Record<BadgeStatus, { label: string; style: string }> = {
  예매완료: { label: "예매완료", style: "bg-success/15 text-success" },
  결제중: { label: "결제중", style: "bg-primary/15 text-primary" },
  취소: { label: "취소", style: "bg-danger/15 text-danger" },
  환불: { label: "환불", style: "bg-orange-100 text-orange-600" },
  매진: { label: "매진", style: "bg-gray-200 text-gray-600" },
  예매가능: { label: "예매가능", style: "bg-teal/15 text-teal" },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export default function Badge({
  status,
  size = "md",
  children,
  className = "",
}: BadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={[
        "inline-flex items-center gap-1",
        "font-pretendard font-semibold rounded-full whitespace-nowrap",
        config.style,
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* children이 있으면 우선, 없으면 status 기본 라벨 */}
      {children ?? config.label}
    </span>
  );
}
