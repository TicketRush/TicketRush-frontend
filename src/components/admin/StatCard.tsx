// 관리자 통계 카드 — 상단 4개 배열
// 사진 1, 4, 5의 통계 카드 디자인

import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  badge: string;
  /** badge 색상 클래스 */
  badgeColor: "purple" | "green" | "orange" | "red" | "blue" | "yellow";
  value: string | number;
  label: string;
}

const BADGE_COLORS = {
  purple: "bg-purple-500/20 text-purple-300",
  green: "bg-green-500/20 text-green-300",
  orange: "bg-orange-500/20 text-orange-300",
  red: "bg-red-500/20 text-red-300",
  blue: "bg-blue-500/20 text-blue-300",
  yellow: "bg-yellow-500/20 text-yellow-300",
};

export default function StatCard({
  icon,
  badge,
  badgeColor,
  value,
  label,
}: StatCardProps) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="text-admin-text-secondary">{icon}</div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${BADGE_COLORS[badgeColor]}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-3xl font-bold text-admin-text mb-1">{value}</p>
      <p className="text-xs text-admin-text-secondary">{label}</p>
    </div>
  );
}
