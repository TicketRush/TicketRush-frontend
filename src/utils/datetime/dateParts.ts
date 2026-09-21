export interface DateParts {
  year: string;
  month: string;
  day: string;
}

export function isValidYear(year: string): boolean {
  return /^[1-9]\d{3}$/.test(year);
}

/** Gregorian calendar arithmetic, independent of Date and timezones. */
export function getDaysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || year < 1 || year > 9999 ||
      !Number.isInteger(month) || month < 1 || month > 12) return 0;
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function changeDatePart(value: DateParts, part: keyof DateParts, input: string): DateParts {
  const next = { ...value, [part]: input };
  // Preserve candidates while the year is being edited; validate once complete.
  if (part === "year" && !isValidYear(next.year)) return next;
  const days = isValidYear(next.year) ? getDaysInMonth(Number(next.year), Number(next.month)) : 0;
  if (next.day && (!/^\d{1,2}$/.test(next.day) || Number(next.day) < 1 || Number(next.day) > days)) {
    next.day = "";
  }
  return next;
}
