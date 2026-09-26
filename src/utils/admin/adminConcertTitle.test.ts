import { describe, expect, it, vi } from "vitest";
import type { AdminConcertListResponse } from "@/types/domain/admin";
import {
  freshAdminConcertPages,
  resolveAdminConcertTitle,
  titleFromAdminConcertPages,
} from "./adminConcertTitle";

function page(
  items: Array<{ id: number; title: string }>,
  hasNext: boolean,
  totalPages: number,
  pageIndex = 0,
): AdminConcertListResponse {
  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      genre: "CONCERT",
      date: "2027-01-01",
      status: "ON_SALE",
    })),
    pagination: {
      pageIndex,
      size: 50,
      totalElements: items.length,
      totalPages,
      hasNext,
    },
  };
}

describe("adminConcertTitle", () => {
  it("캐시된 목록에서 공백 없는 제목만 고른다", () => {
    expect(
      titleFromAdminConcertPages(
        [page([{ id: 3, title: "   " }], false, 1), undefined],
        3,
      ),
    ).toBeUndefined();
    expect(
      titleFromAdminConcertPages(
        [page([{ id: 9, title: "다른 공연" }, { id: 12, title: " 밤의 공연 " }], false, 1)],
        12,
      ),
    ).toBe("밤의 공연");
  });

  it("캐시에 있으면 목록을 다시 받지 않는다", async () => {
    const fetchPage = vi.fn();
    await expect(
      resolveAdminConcertTitle(12, {
        cached: [page([{ id: 12, title: "캐시 공연" }], false, 1)],
        pageSize: 50,
        fetchPage,
      }),
    ).resolves.toBe("캐시 공연");
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("다음 페이지까지 찾아 없으면 null이다", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page([{ id: 1, title: "첫 페이지" }], true, 2))
      .mockResolvedValueOnce(page([{ id: 12, title: "" }], false, 2));

    await expect(
      resolveAdminConcertTitle(12, { cached: [], pageSize: 50, fetchPage }),
    ).resolves.toBeNull();
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1);
  });

  it("같은 크기의 신선한 페이지는 다시 받지 않고 다음 페이지를 본다", async () => {
    const fetchPage = vi.fn().mockResolvedValue(
      page([{ id: 12, title: "둘째" }], false, 2, 1),
    );
    await expect(
      resolveAdminConcertTitle(12, {
        cached: [page([{ id: 1, title: "첫째" }], true, 2, 0)],
        pageSize: 50,
        fetchPage,
      }),
    ).resolves.toBe("둘째");
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1);
  });

  it("오래됐거나 무효화된 목록은 제목으로 쓰지 않는다", () => {
    const fresh = page([{ id: 12, title: "새 제목" }], false, 1);
    const stale = page([{ id: 12, title: "옛 제목" }], false, 1);
    expect(
      freshAdminConcertPages(
        [
          { data: stale, updatedAt: 0, invalidated: false },
          { data: fresh, updatedAt: 1_000, invalidated: true },
          { data: fresh, updatedAt: 1_000, invalidated: false },
        ],
        31_000,
        30_000,
      ),
    ).toEqual([fresh]);
  });

  it("조회가 취소되면 다음 페이지를 받지 않는다", async () => {
    const controller = new AbortController();
    const fetchPage = vi.fn().mockImplementation(async () => {
      controller.abort();
      return page([{ id: 1, title: "첫째" }], true, 3, 0);
    });
    await expect(
      resolveAdminConcertTitle(12, {
        cached: [],
        pageSize: 50,
        fetchPage,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
