// 좌석 범례 — Figma 「좌석 선택」 우측 패널 (#102)
import { SEAT_STATUS_LABEL } from "./seatStatusLabel";

export default function SeatLegend() {
  return (
    <div className="bg-white rounded-xl p-5 space-y-4 text-sm shadow-card shrink-0">
      <LegendRow
        swatch="bg-seat-selected border-2 border-seat-selected-border"
        label={SEAT_STATUS_LABEL.SELECTED}
        labelClass="text-seat-selected"
      />
      <LegendRow
        swatch="bg-seat-available border-2 border-seat-available"
        label={SEAT_STATUS_LABEL.AVAILABLE}
        labelClass="text-seat-available"
      />
      <LegendRow
        swatch="bg-seat-holding border-2 border-seat-holding-border"
        label={SEAT_STATUS_LABEL.HOLD}
        labelClass="text-text-secondary"
      />
      <LegendRow
        swatch="bg-seat-sold border-2 border-seat-sold-border"
        label={SEAT_STATUS_LABEL.SOLD}
        labelClass="text-text-secondary"
      />
    </div>
  );
}

function LegendRow({
  swatch,
  label,
  labelClass,
}: {
  swatch: string;
  label: string;
  labelClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-8 h-8 rounded shrink-0 ${swatch}`} />
      <span className={labelClass}>{label}</span>
    </div>
  );
}
