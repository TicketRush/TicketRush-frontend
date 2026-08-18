/**
 * 상세 UPCOMING 오픈 안내용 시각 포맷.
 * 백엔드 ISO(UTC `Z` / offset 포함)를 Asia/Seoul 벽시계로 표시한다.
 * offset 없는 naive 문자열은 `Date` 파싱 규칙(환경 로컬)에 따른 뒤 Seoul로 포맷한다.
 */
export function formatBookingOpenAt(
  iso: string,
  timeZone: string = "Asia/Seoul",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const weekday = get("weekday");
  const hh = get("hour");
  const min = get("minute");

  if (!yyyy || !mm || !dd || !weekday || !hh || !min) return "";

  return `${yyyy}년 ${mm}월 ${dd}일(${weekday}) ${hh}:${min}`;
}
