const WEEKDAY_NAMES = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;

export interface AdminCalendarDayNameState {
  isToday?: boolean;
  /** 시작일만 고른 상태. 종료일이 확정된 하루가 아니다. */
  isPendingStart?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  /** 확정된 시작·종료 사이의 날. 가장자리는 제외한다. */
  isInRange?: boolean;
  /** 비활성 칸의 툴팁과 같은 문장. */
  disabledTitle?: string;
}

/** 보이는 숫자는 일만 두고, 접근 이름은 연·월·일·요일과 상태로 만든다. */
export function formatAdminCalendarDayName(
  date: Date,
  state: AdminCalendarDayNameState = {},
): string {
  const dateLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_NAMES[date.getDay()]}`;
  const suffixes: string[] = [];

  if (state.isToday) suffixes.push("오늘");

  if (state.isPendingStart) {
    suffixes.push("시작일");
  } else if (state.isRangeStart && state.isRangeEnd) {
    suffixes.push("시작일과 종료일");
  } else if (state.isRangeStart) {
    suffixes.push("시작일");
  } else if (state.isRangeEnd) {
    suffixes.push("종료일");
  } else if (state.isInRange) {
    suffixes.push("선택한 기간");
  }

  if (state.disabledTitle) {
    suffixes.push("선택 불가", state.disabledTitle);
  }

  return suffixes.length > 0 ? `${dateLabel}, ${suffixes.join(", ")}` : dateLabel;
}
