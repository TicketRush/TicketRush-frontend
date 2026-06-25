// 공연별 판매 진행률 바
interface ProgressBarProps {
  current: number;
  total: number;
  variant?: "default" | "sold-out";
  /** 색상 강제 지정 (없으면 variant 따라 자동) */
  colorClass?: string;
}

export default function ProgressBar({
  current,
  total,
  variant = "default",
  colorClass,
}: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const isSoldOut = variant === "sold-out" || percent >= 100;

  const barColor =
    colorClass ??
    (isSoldOut
      ? "bg-green-500"
      : percent < 50
        ? "bg-gray-400"
        : "bg-blue-500");

  return (
    <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
