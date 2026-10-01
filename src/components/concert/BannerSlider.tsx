import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BannerSlide from "./BannerSlide";
import { useBanners } from "@/hooks/queries/useBanners";

const AUTO_SLIDE_INTERVAL = 4000;
const ARROW_CLASS = "absolute top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-10 sm:w-10";

export default function BannerSlider() {
  const { data: banners, isPending, isError, isFetching } = useBanners();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = banners?.length ?? 0;
  const moveSlide = useCallback((direction: number) => {
    if (totalSlides <= 1) return;
    setCurrentIndex((index) => (index + direction + totalSlides) % totalSlides);
  }, [totalSlides]);

  // 자동 슬라이드 + hover/focus pause
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      moveSlide(1);
    }, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, totalSlides, moveSlide]);

  // 슬라이드 수가 바뀌었을 때 인덱스 초과 방지
  const safeIndex = totalSlides > 0 ? currentIndex % totalSlides : 0;

  // 재시도 대기·에러 후 refetch 중에도 스켈레톤 유지
  const showLoading = isPending || (isFetching && !banners);
  if (showLoading) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-2xl animate-pulse" />
    );
  }

  // 조회 실패와 빈 목록은 모두 배너 영역을 숨긴다 (이슈 #190).
  if (isError || !banners || banners.length === 0) {
    return null;
  }

  const current = banners[safeIndex];
  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="relative">
        <BannerSlide key={current.performanceId} banner={current} posterUrl={current.imageUrl} />
        {totalSlides > 1 && (
          <>
            <button type="button" aria-label="이전 배너" onClick={() => moveSlide(-1)}
              className={`${ARROW_CLASS} left-1 sm:left-2 lg:left-3`}>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" aria-label="다음 배너" onClick={() => moveSlide(1)}
              className={`${ARROW_CLASS} right-1 sm:right-2 lg:right-3`}>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {banners.map((banner, idx) => (
            <button
              key={banner.performanceId}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === safeIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-current={idx === safeIndex ? "true" : undefined}
              aria-label={`슬라이드 ${idx + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
