import type { KeyboardEventHandler } from "react";
import DatePartsInput from "./DatePartsInput";

export default function ShowDateInput({ value, onChange, onKeyDown, ...accessibilityProps }: {
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLSelectElement>;
}) {
  const [year = "", month = "", day = ""] = value.split("-");
  return (
    <fieldset aria-label="공연 날짜">
      <DatePartsInput {...accessibilityProps} showRequiredIndicator id="show-date" data-form-focus="true" onKeyDown={onKeyDown} value={{ year, month, day }} onChange={(parts) => {
        // Keep partial dates nonempty so required/date validation can reject them.
        onChange(!parts.year && !parts.month && !parts.day ? ""
          : `${parts.year}-${parts.month}-${parts.day}`);
      }} />
    </fieldset>
  );
}
