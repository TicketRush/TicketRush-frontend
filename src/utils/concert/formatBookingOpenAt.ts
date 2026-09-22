import { parseBookingOpenAt } from "./parseBookingOpenAt";

/**
 * 상세 UPCOMING 오픈 안내용 시각 포맷.
 * legacy KST 벽시계 또는 명시적 Z/offset을 Asia/Seoul 기준으로 표시한다.
 */
export function formatBookingOpenAt(
  iso: string,
  timeZone: string = "Asia/Seoul",
): string {
  const ms = parseBookingOpenAt(iso);
  if (ms == null) return "";

  const d = new Date(ms);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
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
