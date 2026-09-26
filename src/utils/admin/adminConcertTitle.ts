import type { AdminConcertListResponse } from "@/types/domain/admin";

/** 50개씩 20페이지. 관리자 단건 조회가 없어 목록을 순서대로 찾는다. */
const TITLE_PAGE_CAP = 20;

export function titleFromAdminConcertPages(
  pages: Array<Pick<AdminConcertListResponse, "items"> | undefined>,
  performanceId: number,
): string | undefined {
  for (const page of pages) {
    const raw = page?.items.find((item) => item.id === performanceId)?.title;
    if (typeof raw !== "string") continue;
    const title = raw.trim();
    if (title) return title;
  }
  return undefined;
}

export function freshAdminConcertPages(
  pages: Array<{
    data: AdminConcertListResponse | undefined;
    updatedAt: number;
    invalidated: boolean;
  }>,
  now: number,
  maxAgeMs: number,
): AdminConcertListResponse[] {
  return pages.flatMap((page) => {
    if (page.invalidated || page.data == null) return [];
    if (now - page.updatedAt > maxAgeMs) return [];
    return [page.data];
  });
}

export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error == null) return false;
  const name = "name" in error ? String(error.name) : "";
  const code = "code" in error ? String(error.code) : "";
  return name === "AbortError" || name === "CanceledError" || code === "ERR_CANCELED";
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException("Aborted", "AbortError");
}

export async function resolveAdminConcertTitle(
  performanceId: number,
  source: {
    cached: AdminConcertListResponse[];
    pageSize: number;
    fetchPage: (page: number) => Promise<AdminConcertListResponse>;
    signal?: AbortSignal;
  },
): Promise<string | null> {
  const cached = titleFromAdminConcertPages(source.cached, performanceId);
  if (cached) return cached;

  let page = 0;
  let totalPages = 1;
  while (page < totalPages && page < TITLE_PAGE_CAP) {
    throwIfAborted(source.signal);
    const cachedPage = source.cached.find(
      (item) =>
        item.pagination.pageIndex === page &&
        item.pagination.size === source.pageSize,
    );
    const list = cachedPage ?? (await source.fetchPage(page));
    const title = titleFromAdminConcertPages([list], performanceId);
    if (title) return title;
    totalPages = list.pagination.totalPages;
    if (!list.pagination.hasNext) break;
    page += 1;
  }
  return null;
}
