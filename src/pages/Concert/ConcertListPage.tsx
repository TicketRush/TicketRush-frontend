import { useEffect, useRef } from "react";
import { useConcerts } from "@/hooks/queries/useConcerts";
import ConcertCard from "@/components/concert/ConcertCard";
import ConcertCardSkeleton from "@/components/concert/ConcertCardSkeleton";
import BannerSlider from "@/components/concert/BannerSlider";

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* 제목 */}
      <div>
        <h1 className="text-3xl font-bold text-text">공연 목록</h1>
        <p className="text-sm text-text-secondary mt-1">
          예매 가능한 공연을 선택하세요
        </p>
      </div>

      {/* 카드 그리드 */}
      {isError ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          공연 목록을 불러올 수 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <ConcertCardSkeleton key={i} />
              ))
            : concerts.map((c) => <ConcertCard key={c.id} concert={c} />)}
        </div>
      )}

      {!isLoading && concerts.length === 0 && !isError && (
        <div className="text-center text-text-secondary py-12">
          등록된 공연이 없습니다.
        </div>
      )}

      {/* 배너 슬라이더 */}
      <BannerSlider />

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
