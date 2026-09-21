import DatePartsInput from "./DatePartsInput";
import type { DateParts } from "@/utils/datetime/dateParts";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function BookingOpenAtInput({ value, onChange }: Props) {
  const [date = "", time = ""] = value.replace(" ", "T").split("T");
  const [year = "", month = "", day = ""] = date.split("-");
  const displayTime = time.endsWith(":00") && time.length === 8 ? time.slice(0, 5) : time;
  function update(parts: DateParts, nextTime: string) {
    // Keep incomplete input nonempty so existing form/API validation rejects it.
    // Emit nothing on mount: unchanged edit values (including seconds) stay exact.
    onChange(!parts.year && !parts.month && !parts.day && !nextTime
      ? ""
      : `${parts.year}-${parts.month}-${parts.day}T${nextTime}`);
  }
  return (
    <div className="space-y-3">
      <DatePartsInput id="booking-open" value={{ year, month, day }} onChange={(parts) => update(parts, time)} />
      <label htmlFor="booking-open-time" className="block space-y-1 text-sm">
        <span>시간</span>
        <input id="booking-open-time" type="time" value={displayTime} step={displayTime.length === 8 ? 1 : 60}
          onChange={(event) => {
            const next = event.target.value;
            update({ year, month, day }, next === displayTime ? time
              : next.length === 5 && time.length === 8 ? `${next}:00` : next);
          }}
          className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary xl:px-4 xl:py-3 xl:text-base" />
      </label>
    </div>
  );
}
