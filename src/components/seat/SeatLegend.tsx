// 좌석 범례
export default function SeatLegend() {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs min-w-[120px]">
      <LegendRow
        color="bg-white border border-seat-available"
        label="예매가능"
      />
      <LegendRow color="bg-seat-holding" label="임시예매" />
      <LegendRow color="bg-seat-sold" label="예매완료" />
      <LegendRow color="bg-seat-selected" label="선택한 좌석" />
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded ${color}`} />
      <span className="text-text-secondary">{label}</span>
    </div>
  );
}
