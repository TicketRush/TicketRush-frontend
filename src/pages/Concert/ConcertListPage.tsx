import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useConcerts } from "@/hooks/queries/useConcerts";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import ConcertCard from "@/components/concert/ConcertCard";
import ConcertCardSkeleton from "@/components/concert/ConcertCardSkeleton";
import BannerSlider from "@/components/concert/BannerSlider";

function ConcertGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {children}
    </div>
  );
}

function ConcertListSkeleton({ count }: { count: number }) {
  return (
    <ConcertGrid>
      {Array.from({ length: count }).map((_, i) => (
        <ConcertCardSkeleton key={i} />
      ))}
    </ConcertGrid>
  );
}

export default function ConcertListPage() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  useDocumentTitle(isHome ? "TicketRush" : "공연 목록", { exact: isHome });

  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchNextPageError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConcerts({ size: 8 });

  // 무한 스크롤
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage && !isFetchNextPageError) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const concerts = data?.pages.flatMap((p) => p.items) ?? [];

  // Figma는 배너가 목록 맨 아래가 아니라 첫 줄과 둘째 줄 사이에 끼는 구성이다.
  // 배너를 그리드 안에 넣으면 col-span-full이 줄을 넘기면서 빈 칸이 생기므로
  // 그리드를 둘로 나눠 사이에 배치한다.
  const BANNER_AFTER = 4;
  const beforeBanner = concerts.slice(0, BANNER_AFTER);
  const afterBanner = concerts.slice(BANNER_AFTER);

  // isLoading(= isPending && isFetching)은 재시도 대기 중 false가 되어
  // 빈 목록/에러로 깜빡일 수 있음 → isPending 또는 데이터 없는 refetch 중에는 스켈레톤 유지
  const showLoading = isPending || (isFetching && !data);
  // 다음 페이지 실패(isFetchNextPageError)는 목록을 유지하고 하단에서만 처리
  const showError = isError && !data && !isFetching;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* 제목 */}
      <div>
        <h1 className="text-3xl font-bold text-text">공연 목록</h1>
        <p className="text-sm text-text-secondary mt-1">
          예매 가능한 공연을 선택하세요
        </p>
      </div>

      {showError ? (
        <div
          role="alert"
          className="bg-white border border-border rounded-xl p-12 text-center space-y-4"
        >
          <p className="text-error">공연 목록을 불러올 수 없습니다.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-busy={isFetching}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다시 시도
          </button>
        </div>
      ) : showLoading ? (
        <ConcertListSkeleton count={BANNER_AFTER} />
      ) : concerts.length === 0 ? (
        <div className="text-center text-text-secondary py-12">
          등록된 공연이 없습니다.
        </div>
      ) : (
        <ConcertGrid>
          {beforeBanner.map((c) => (
            <ConcertCard key={c.id} concert={c} />
          ))}
        </ConcertGrid>
      )}

      {/* 목록이 비거나 로딩 중이어도 배너는 같은 위치에 둔다 */}
      <BannerSlider concerts={concerts} />

      {!showError &&
        (showLoading ? (
          <ConcertListSkeleton count={BANNER_AFTER} />
        ) : (
          afterBanner.length > 0 && (
            <ConcertGrid>
              {afterBanner.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </ConcertGrid>
          )
        ))}

      {/* 무한 스크롤 trigger */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center text-text-secondary py-4 text-xs">
          더 불러오는 중...
        </div>
      )}
      {isFetchNextPageError && !isFetchingNextPage && (
        <div role="alert" className="text-center py-4 space-y-2">
          <p className="text-sm text-error">추가 공연을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            aria-busy={isFetchingNextPage}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
