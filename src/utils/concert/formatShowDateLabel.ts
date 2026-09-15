/**
 * 공연 `showDate`(서울 달력 `YYYY-MM-DD`) 표시용.
 * `new Date(showDate)`를 쓰지 않아 브라우저 TZ에 날짜가 밀리지 않는다 (#265).
 */
export function formatShowDateLabel(
  showDate: string | null | undefined,
): string {
  const trimmed = showDate?.trim() ?? "";
  if (!trimmed) return "-";
  return trimmed;
}
