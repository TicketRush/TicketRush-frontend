import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { useBanners } from "@/hooks/queries/useBanners";

const AUTO_SLIDE_INTERVAL = 4000;

// 슬라이드별 배경 그라데이션 (id 기준 순환)
const GRADIENTS = [
  "from-purple-500 to-indigo-600",
  "from-pink-500 to-purple-600",
  "from-blue-500 to-cyan-600",
];

export default function BannerSlider() {
  const navigate = useNavigate();
  const { data: banners, isLoading } = useBanners();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = banners?.length ?? 0;

  // 자동 슬라이드 + hover pause
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((p) => (p + 1) % totalSlides);
    }, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, totalSlides]);

  // 슬라이드 수가 바뀌었을 때 인덱스 초과 방지
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, totalSlides]);

  if (isLoading) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-2xl animate-pulse" />
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  const current = banners[currentIndex];
  const gradient = GRADIENTS[currentIndex % GRADIENTS.length];
  const isClickable = !!current.linkConcertId;

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={`bg-gradient-to-r ${gradient} rounded-2xl p-8 overflow-hidden relative transition-all duration-500 ${
          isClickable ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (current.linkConcertId) {
            navigate(`/concerts/${current.linkConcertId}`);
          }
        }}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : -1}
      >
        {/* 컨텐츠 */}
        <div className="relative z-10 text-white max-w-2xl">
          {current.tagLabel && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur mb-3">
              {current.tagLabel}
            </span>
          )}
          <h2 className="text-3xl font-bold mb-1">
            {current.iconEmoji && (
              <span className="mr-2">{current.iconEmoji}</span>
            )}
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="text-lg mb-2 font-semibold">{current.subtitle}</p>
          )}
          {current.description && (
            <p className="text-sm opacity-90 mb-3">{current.description}</p>
          )}
          {current.date && (
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar size={14} />
              <span>{current.date}</span>
            </div>
          )}
        </div>

        {/* 우측 워터마크 이모지 */}
        {current.iconEmoji && (
          <div
            className="absolute right-12 top-1/2 -translate-y-1/2 text-white/15 text-9xl pointer-events-none select-none"
            aria-hidden="true"
          >
            {current.iconEmoji}
          </div>
        )}
      </div>

      {/* 인디케이터 도트 */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {banners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`슬라이드 ${idx + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
