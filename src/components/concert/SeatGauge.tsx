interface SeatGaugeProps {
  /** null이면 미확정 → "-" 표시, 게이지 바는 숨기되 높이만 유지 */
  remaining: number | null;
  /** 0 이하면 채움 계산을 하지 않고 바만 숨긴다 (#203) */
  total: number;
}

export default function SeatGauge({ remaining, total }: SeatGaugeProps) {
  if (remaining === null) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-xs text-placeholder">잔여 좌석</span>
          <span className="text-sm font-bold text-text-secondary">-</span>
        </div>
        {/* 확정 시 게이지(h-1)와 동일 높이 — 카드 CTA 정렬용 */}
        <div className="w-full h-1" aria-hidden />
      </div>
    );
  }

  const showBar = total > 0;
  const percent = showBar ? Math.round((remaining / total) * 100) : 0;
  const isSoldOut = remaining === 0;
  // 마감임박 = 잔여 20% 이하 (단, 매진 제외). 매진(0)은 일반 색 유지
  const isEndingSoon = showBar && !isSoldOut && percent <= 20;

  const barColor = isEndingSoon ? "bg-danger" : "bg-primary";

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-placeholder">잔여 좌석</span>
        <span className="text-sm font-bold text-text">{remaining}석</span>
      </div>
      {showBar ? (
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
      ) : (
        <div className="w-full h-1" aria-hidden />
      )}
    </div>
  );
}
