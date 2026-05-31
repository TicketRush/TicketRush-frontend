// 좌석 통계 패널
interface SeatInfoPanelProps {
  total: number;
  available: number;
  selected: number;
}

export default function SeatInfoPanel({
  total,
  available,
  selected,
}: SeatInfoPanelProps) {
  return (
    <div className="bg-white border border-border rounded-xl p-6 grid grid-cols-3 gap-4 text-center">
      <Stat label="전체 좌석" value={total} colorClass="text-text" />
      <Stat label="예매 가능" value={available} colorClass="text-primary" />
      <Stat label="선택한 좌석" value={selected} colorClass="text-error" />
    </div>
  );
}

function Stat({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div>
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
