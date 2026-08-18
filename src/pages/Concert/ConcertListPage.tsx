import { useEffect, useRef, type ReactNode } from "react";
import { useConcerts } from "@/hooks/queries/useConcerts";
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

export default function ConcertListPage() {
  const {
    data,
    isLoading,
    isError,
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
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const concerts = data?.pages.flatMap((p) => p.items) ?? [];

  // Figma는 배너가 목록 맨 아래가 아니라 첫 줄과 둘째 줄 사이에 끼는 구성이다.
  // 배너를 그리드 안에 넣으면 col-span-full이 줄을 넘기면서 빈 칸이 생기므로
  // 그리드를 둘로 나눠 사이에 배치한다.
  const BANNER_AFTER = 4;
  const beforeBanner = concerts.slice(0, BANNER_AFTER);
  const afterBanner = concerts.slice(BANNER_AFTER);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* 제목 */}
      <div>
        <h1 className="text-3xl font-bold text-text">공연 목록</h1>
        <p className="text-sm text-text-secondary mt-1">
          예매 가능한 공연을 선택하세요
        </p>
      </div>

      {isError ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          공연 목록을 불러올 수 없습니다.
        </div>
      ) : isLoading ? (
        <ConcertGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <ConcertCardSkeleton key={i} />
          ))}
        </ConcertGrid>
      ) : concerts.length === 0 ? (
        <div className="text-center text-text-secondary py-12">
          등록된 공연이 없습니다.
        </div>
      ) : (
        <>
          {/* 배너 위 첫 줄 */}
          <ConcertGrid>
            {beforeBanner.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </ConcertGrid>

          <BannerSlider />

          {/* 배너 아래 나머지 */}
          {afterBanner.length > 0 && (
            <ConcertGrid>
              {afterBanner.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </ConcertGrid>
          )}
        </>
      )}

      {/* 무한 스크롤 trigger */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center text-text-secondary py-4 text-xs">
          더 불러오는 중...
        </div>
      )}
    </div>
  );
}
