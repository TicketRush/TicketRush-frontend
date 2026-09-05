/**
 * 목록 API 좌석 수 존재 여부.
 * BE는 조회 실패·totalCount==0이면 키를 생략하고, 값은 null이 아니다 (#203 / PR #623).
 * 한쪽만 있거나 null이면 모름 — remainingSeats === 0만 보면 분모 없는 매진이 된다.
 */
export function hasSeatCounts(concert: {
  totalSeats?: number | null;
  remainingSeats?: number | null;
}): concert is { totalSeats: number; remainingSeats: number } {
  return (
    typeof concert.totalSeats === "number" &&
    typeof concert.remainingSeats === "number"
  );
}
