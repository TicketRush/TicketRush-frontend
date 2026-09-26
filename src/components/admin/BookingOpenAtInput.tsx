import DatePartsInput from "./DatePartsInput";
import { formatTimeInput, timeInputClass } from "@/utils/admin/timeInput";
import type { DateParts } from "@/utils/datetime/dateParts";

interface Props {
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function BookingOpenAtInput({ value, onChange, ...accessibilityProps }: Props) {
  const [date = "", time = ""] = value.replace(" ", "T").split("T");
  const [year = "", month = "", day = ""] = date.split("-");
  // A partial seconds segment still belongs to the same edit session. The
  // existing minute-only update below retains its :00 marker; clearing resets it.
  const withSeconds = time.split(":").length === 3;
  const displayTime = time.endsWith(":00") && time.length === 8 ? time.slice(0, 5) : time;
  function update(parts: DateParts, nextTime: string) {
    // Keep incomplete input nonempty so existing form/API validation rejects it.
    // Emit nothing on mount: unchanged edit values (including seconds) stay exact.
    onChange(!parts.year && !parts.month && !parts.day && !nextTime
      ? ""
      : `${parts.year}-${parts.month}-${parts.day}${value.includes(" ") ? " " : "T"}${nextTime}`);
  }
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      <div className="min-w-0 lg:col-span-3">
      <DatePartsInput {...accessibilityProps} id="booking-open" value={{ year, month, day }} onChange={(parts) => update(parts, time)} />
      </div>
      <label htmlFor="booking-open-time" className="block space-y-1 text-sm">
        <span>시간</span>
        <input {...accessibilityProps} id="booking-open-time" type="text" value={displayTime}
          inputMode="numeric" placeholder="예: 19:00" maxLength={withSeconds ? 8 : 5}
          onChange={(event) => {
            const next = formatTimeInput(event.target.value, withSeconds);
            update({ year, month, day }, next === displayTime ? time
              : next.length === 5 && withSeconds ? `${next}:00` : next);
          }}
          className={timeInputClass} />
      </label>
    </div>
  );
}
