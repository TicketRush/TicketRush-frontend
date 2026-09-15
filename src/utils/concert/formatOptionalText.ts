/** 등록 시 비워 둔 필드의 공통 표시 문구 */
export const UNSET_LABEL = "미정";

/** trim 후 비어 있으면 null (호출측에서 UNSET_LABEL / 숨김 분기) */
export function trimOrNull(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

/**
 * 상세 InfoBox용 공연 시간 라벨.
 * 시간·러닝타임 중 있는 것만 조합하고, 둘 다 없으면 빈 문자열.
 */
export function formatShowScheduleLabel(
  showTime: string | null | undefined,
  durationMinutes: number | null | undefined,
): string {
  const time = trimOrNull(showTime);
  const hasDuration =
    typeof durationMinutes === "number" && durationMinutes > 0;

  if (time && hasDuration) return `${time} (${durationMinutes}분)`;
  if (time) return time;
  if (hasDuration) return `${durationMinutes}분`;
  return "";
}
