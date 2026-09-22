import type {
  BookingListItem,
  MyBookingsResponse,
} from "@/types/domain/booking";

/** BE `/booking/me` size 상한. 이보다 크게 보내면 잘리고 hasNext가 거짓이 될 수 있다 (#380). */
export const MY_BOOKINGS_PAGE_SIZE = 50;
/** 상태별 이어 붙이기 상한. 무한 요청을 막는다. */
export const MY_BOOKINGS_MAX_PAGES = 50;

export function pageItems<T>(
  items: readonly T[],
  page: number,
  size: number,
): { items: T[]; hasNext: boolean } {
  const start = Math.max(0, page) * size;
  return {
    items: items.slice(start, start + size),
    hasNext: start + size < items.length,
  };
}

export function uniqueMyBookingCount(
  pages: readonly { items: ReadonlyArray<{ bookingId: number }> }[],
): number {
  const ids = new Set<number>();
  for (const page of pages) {
    for (const item of page.items) ids.add(item.bookingId);
  }
  return ids.size;
}

export function myBookingsPagesStalled(
  pages: readonly { items: ReadonlyArray<{ bookingId: number }> }[] | undefined,
): boolean {
  if (!pages || pages.length < 2) return false;
  return uniqueMyBookingCount(pages) <= uniqueMyBookingCount(pages.slice(0, -1));
}

export function mergeMyBookingsById<T>(
  batches: readonly T[][],
  getId: (item: T) => number,
  getSortKey: (item: T) => string,
): T[] {
  const merged = new Map<number, T>();
  for (const batch of batches) {
    for (const item of batch) {
      merged.set(getId(item), item);
    }
  }
  return Array.from(merged.values()).sort((a, b) =>
    getSortKey(b).localeCompare(getSortKey(a)),
  );
}

export function flattenMyBookingPages(
  pages: readonly { items: BookingListItem[] }[] | undefined,
): BookingListItem[] {
  if (!pages?.length) return [];
  return mergeMyBookingsById(
    pages.map((page) => page.items),
    (item) => item.bookingId,
    (item) => item.createdAt ?? "",
  );
}

export function myBookingsHasMore(input: {
  hasNextPage: boolean;
  loadedCount: number;
  totalCount?: number;
  stalled?: boolean;
}): boolean {
  if (input.stalled) return false;
  if (input.hasNextPage) return true;
  if (input.totalCount == null) return false;
  return input.totalCount > input.loadedCount;
}

export function shouldPrefetchMyBookingsTab(input: {
  tabItemCount: number;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}): boolean {
  return (
    input.tabItemCount === 0 &&
    input.hasMore &&
    !input.isFetchingNextPage &&
    !input.isFetchNextPageError
  );
}

export function nextMyBookingsPageParam(
  lastPage: Pick<MyBookingsResponse, "items" | "hasNext">,
  allPages: readonly Pick<MyBookingsResponse, "items">[],
  options: { maxPages: number; totalCount?: number },
): number | undefined {
  if (allPages.length >= options.maxPages) return undefined;
  if (myBookingsPagesStalled(allPages)) return undefined;
  if (lastPage.hasNext) return allPages.length;
  const loaded = uniqueMyBookingCount(allPages);
  if (
    options.totalCount != null &&
    options.totalCount > loaded &&
    lastPage.items.length > 0
  ) {
    return allPages.length;
  }
  return undefined;
}
