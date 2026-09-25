/** 열 번호(1부터)에 좌석을 두고, 없는 칸은 빈자리로 둔다. */
export function placeSeatsInColumns<T extends { col: number }>(
  seats: T[],
  columnCount: number,
): (T | null)[] {
  const slots: (T | null)[] = Array.from({ length: columnCount }, () => null);
  for (const seat of seats) {
    if (seat.col < 1 || seat.col > columnCount) continue;
    slots[seat.col - 1] = seat;
  }
  return slots;
}
