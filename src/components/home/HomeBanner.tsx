// src/components/home/HomeBanner.tsx
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { useNavigate } from "react-router-dom";

import "swiper/css";
import "swiper/css/pagination";

interface BannerItem {
  id: number;
  concertId: string; // 카드 클릭 시 이동할 공연 상세
  title: string;
  subtitle: string;
  description: string;
  date: string;
  badge?: string; // "조기 예매 할인", "VIP 패키지" 등
}

/**
 * 메인 페이지 상단 노출용 배너 데이터
 * 추후 어드민에서 등록한 배너 API로 대체 예정 (현재는 정적)
 */
const BANNERS: BannerItem[] = [
  {
    id: 1,
    concertId: "cn_summer_jazz",
    title: "Summer Jazz Night",
    subtitle: "여름밤의 재즈 향연",
    description: "세계적인 재즈 뮤지션과 함께하는 특별한 밤",
    date: "2026-06-15",
    badge: "조기 예매 할인",
  },
  {
    id: 2,
    concertId: "cn_k_pop_festival",
    title: "K-POP Festival 2026",
    subtitle: "최고의 아이돌 라인업",
    description: "팬들이 기다려온 단 한 번의 무대",
    date: "2026-07-22",
    badge: "VIP 패키지 한정",
  },
  {
    id: 3,
    concertId: "cn_classical_gala",
    title: "Classical Gala Night",
    subtitle: "클래식의 모든 것",
    description: "오케스트라와 솔리스트가 함께하는 특별 공연",
    date: "2026-08-10",
  },
];

/**
 * 메인 페이지 상단 배너 슬라이더
 *
 * ─ 운영 정책 ─
 * [배너 슬라이더]
 *  - 자동 스크롤: 4초 간격 자동 슬라이드
 *  - 마우스 호버 시 일시 정지(pause), 이탈 시 재개(resume)
 *
 * ─ 디자인 ─
 *  - Figma 스펙: 1128 × 295.91, radius 10px, padding 48px
 *  - 좌우로 다음/이전 배너가 살짝 보이도록 slidesPerView 1.05
 *  - 페이지네이션 점 하단 표시 (clickable)
 */
export function HomeBanner() {
  const navigate = useNavigate();

  return (
    <section className="w-full" aria-label="추천 공연 배너">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{
          delay: 4000,
          pauseOnMouseEnter: true, // hover 시 일시 정지
          disableOnInteraction: false, // 사용자 조작 후에도 자동 재생 유지
        }}
        pagination={{ clickable: true }}
        loop
        slidesPerView={1.05}
        spaceBetween={16}
        centeredSlides={false}
        className="ticketrush-home-banner"
      >
        {BANNERS.map((banner) => (
          <SwiperSlide key={banner.id}>
            <button
              type="button"
              onClick={() => navigate(`/concerts/${banner.concertId}`)}
              className="relative w-full h-[296px] rounded-[10px] overflow-hidden text-left
                         px-12 py-12 cursor-pointer
                         bg-gradient-to-r from-[#7C7BC5] to-[#9594DE]
                         shadow-[0_4px_6px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.03)]
                         transition-transform hover:scale-[1.005]"
              aria-label={`${banner.title} 공연 상세 보기`}
            >
              {/* 뱃지 */}
              {banner.badge && (
                <span
                  className="inline-block bg-white/25 text-white text-xs font-medium
                                 px-3 py-1 rounded-full mb-4 backdrop-blur-sm"
                >
                  {banner.badge}
                </span>
              )}

              {/* 제목 */}
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                🎵 {banner.title}
              </h2>

              {/* 부제 */}
              <p className="text-base text-white/90 mb-1">{banner.subtitle}</p>

              {/* 설명 */}
              <p className="text-sm text-white/75 mb-6">{banner.description}</p>

              {/* 공연 날짜 */}
              <p className="text-sm text-white/80">📅 {banner.date}</p>

              {/* 우측 데코 음악 아이콘 (이미지 1 참고) */}
              <svg
                className="absolute right-12 top-1/2 -translate-y-1/2 w-24 h-24 text-white/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-3a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Swiper 페이지네이션 점 색상 커스텀 */}
      <style>{`
        .ticketrush-home-banner .swiper-pagination-bullet {
          background-color: #CBD5E1;
          opacity: 1;
        }
        .ticketrush-home-banner .swiper-pagination-bullet-active {
          background-color: #6C5CE7;
          width: 24px;
          border-radius: 4px;
        }
        .ticketrush-home-banner .swiper-pagination {
          position: relative;
          margin-top: 16px;
        }
      `}</style>
    </section>
  );
}
