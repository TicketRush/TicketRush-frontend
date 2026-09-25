export type SeatArrowDirection = "left" | "right" | "up" | "down";

type ArrowSeat = {
  id: number;
  row: string;
  col: number;
  status: string;
};

export function resolveSeatArrowKey(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): SeatArrowDirection | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === "ArrowLeft") return "left";
  if (event.key === "ArrowRight") return "right";
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  return null;
}

/**
 * 예매 가능한 좌석만 이동한다. 매진·선점은 포커스할 수 없다.
 * 가로는 같은 행의 다음 좌석, 세로는 같은 열에서 다음 행이다.
 * 빈 칸이 있어도 옆으로 건너뛰지 않는다.
 */
export function findAdjacentSeat<T extends ArrowSeat>(
  seats: T[],
  currentId: number,
  direction: SeatArrowDirection,
): T | null {
  const available = seats.filter((seat) => seat.status === "AVAILABLE");
  const current = available.find((seat) => seat.id === currentId);
  if (!current) return null;

  if (direction === "left" || direction === "right") {
    const inRow = available
      .filter((seat) => seat.row === current.row)
      .sort((a, b) => a.col - b.col);
    const index = inRow.findIndex((seat) => seat.id === current.id);
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    return inRow[nextIndex] ?? null;
  }

  const rows = [...new Set(available.map((seat) => seat.row))].sort((a, b) =>
    a.localeCompare(b),
  );
  const rowIndex = rows.indexOf(current.row);
  const step = direction === "up" ? -1 : 1;
  for (let i = rowIndex + step; i >= 0 && i < rows.length; i += step) {
    const next = available.find(
      (seat) => seat.row === rows[i] && seat.col === current.col,
    );
    if (next) return next;
  }
  return null;
}
