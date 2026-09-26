/** 좌석 모니터링 목록 페이지. 주소의 page는 화면에 보이는 번호(1부터)다. */

const LIST_PATH = "/admin/seat-monitoring";

/** 쿼리를 API 페이지(0부터)로 바꾼다. 없거나 1 이하면 첫 페이지. */
export function parseMonitoringListPage(
  raw: string | null | undefined,
): number {
  if (raw == null || raw === "") return 0;
  if (!/^\d+$/.test(raw)) return 0;
  const shown = Number(raw);
  if (!Number.isSafeInteger(shown) || shown <= 1) return 0;
  return shown - 1;
}

/** 첫 페이지는 쿼리를 생략한 목록 주소. pageIndex는 0부터. */
export function monitoringListPath(pageIndex: number): string {
  if (!Number.isSafeInteger(pageIndex) || pageIndex <= 0) return LIST_PATH;
  return `${LIST_PATH}?page=${pageIndex + 1}`;
}

export function readMonitoringListPage(state: unknown): number {
  if (!state || typeof state !== "object") return 0;
  const page = (state as { listPage?: unknown }).listPage;
  if (typeof page !== "number" || !Number.isSafeInteger(page) || page < 0) {
    return 0;
  }
  return page;
}

/** 마지막 페이지를 넘기면 그 페이지로 맞춘다. 맞출 필요가 없으면 null. */
export function clampedMonitoringListPage(
  page: number,
  totalPages: number | null | undefined,
): number | null {
  if (totalPages == null || !Number.isInteger(totalPages) || totalPages < 0) {
    return null;
  }
  const last = Math.max(0, totalPages - 1);
  if (page <= last) return null;
  return last;
}
