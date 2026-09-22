/** booking_open_at only: legacy wall time is KST; explicit offsets are instants. */
export function parseBookingOpenAt(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00", fraction = "", offset = "+09:00"] = match;
  // Reject calendar rollover instead of letting Date.parse normalize invalid input.
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (Number(year) < 1000 || calendar.getUTCFullYear() !== Number(year) ||
      calendar.getUTCMonth() !== Number(month) - 1 || calendar.getUTCDate() !== Number(day) ||
      Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  const ms = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}${fraction}${offset}`);
  return Number.isFinite(ms) ? ms : null;
}

/** #673: strip only the contracted KST offset, preserving wall-clock digits. */
export function bookingOpenAtForInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(value)) {
    return value.slice(0, 19).replace("T", " ");
  }
  // Legacy space/T values stay exact; unknown offsets are not silently relabeled KST.
  return value;
}
