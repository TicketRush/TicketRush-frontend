import type { KeyboardEventHandler } from "react";
import { changeDatePart, getDaysInMonth, isValidYear, type DateParts } from "@/utils/datetime/dateParts";

interface Props {
  id: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLSelectElement>;
  "data-form-focus"?: "true";
}

const inputClass = "w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 xl:px-4 xl:py-3 xl:text-base";

export default function DatePartsInput({ id, value, onChange, ...navigationProps }: Props) {
  const validYear = isValidYear(value.year);
  const days = validYear ? getDaysInMonth(Number(value.year), Number(value.month)) : 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <label htmlFor={`${id}-year`} className="space-y-1 text-sm">
        <span>연도</span>
        <input {...navigationProps} id={`${id}-year`} className={inputClass} type="text" inputMode="numeric" maxLength={4}
          placeholder="YYYY" value={value.year}
          onChange={(event) => {
            if (/^\d{0,4}$/.test(event.target.value)) onChange(changeDatePart(value, "year", event.target.value));
          }} />
      </label>
      <label htmlFor={`${id}-month`} className="space-y-1 text-sm">
        <span>월</span>
        <select {...navigationProps} id={`${id}-month`} className={inputClass} value={value.month} disabled={!validYear}
          onChange={(event) => onChange(changeDatePart(value, "month", event.target.value))}>
          <option value="">월 선택</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <option key={month} value={String(month).padStart(2, "0")}>{month}월</option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-day`} className="space-y-1 text-sm">
        <span>일</span>
        <select {...navigationProps} id={`${id}-day`} className={inputClass} value={value.day} disabled={!days}
          onChange={(event) => onChange(changeDatePart(value, "day", event.target.value))}>
          <option value="">일 선택</option>
          {Array.from({ length: days }, (_, i) => i + 1).map((day) => (
            <option key={day} value={String(day).padStart(2, "0")}>{day}일</option>
          ))}
        </select>
      </label>
    </div>
  );
}
