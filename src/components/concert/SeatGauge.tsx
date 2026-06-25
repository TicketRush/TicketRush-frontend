interface SeatGaugeProps {
  remaining: number;
  total: number;
}

export default function SeatGauge({ remaining, total }: SeatGaugeProps) {
  const percent = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const isSoldOut = remaining === 0;
  // 마감임박 = 잔여 20% 이하 (단, 매진 제외)
  const isEndingSoon = !isSoldOut && percent <= 20;

  const barColor = isSoldOut || isEndingSoon ? "bg-danger" : "bg-primary";

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-placeholder">잔여 좌석</span>
        <span
          className={`text-sm font-bold ${
            isSoldOut ? "text-danger" : "text-text"
          }`}
        >
          {remaining}석
        </span>
      </div>
      <div
        className="w-full h-1 bg-gray-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`잔여 좌석 ${remaining}/${total}`}
      >
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
