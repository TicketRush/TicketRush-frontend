// 공연 카드
//
// 변경 이력:
// - 2026-06-30: artist→performer, date→showDate, time→showTime,
//   posterUrl→imageMainUrl, remainingSeats optional 처리
// - 2026-07-15 (이슈 #121):
//   - status enum 정정: SOLD_OUT 참조 제거
//     매진 판단: status === "CLOSED" OR seatCounts.availableCount === 0
//   - useSeatCounts 훅으로 잔여 좌석 실 API 조회
//     (concert.remainingSeats는 mock 호환 fallback만 사용)
//   - venue optional 처리 (백엔드 venueName 필드 없음, address fallback)
// - 2026-08-06 (이슈 #177):
//   - CLOSED/CANCELED/매진도 카드 클릭으로 상세 진입 허용 (예매 버튼만 비활성)
//   - 잔여 좌석 미확정 시 "0" 대신 "-", 게이지 숨김
// - 2026-08-07 (이슈 #178):
//   - 상태별 CTA 문구, 썸네일 소프트 칩
// - 2026-08-31 (이슈 #203):
//   - 목록 게이지를 GET /performance 의 totalSeats/remainingSeats로 전환
//   - 카드별 useSeatCounts(N+1) 제거. 키 없는 ON_SALE은 fail-open 「예매하기」
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import type { ConcertSummary } from "@/types/domain/concert";
import { getBookingCtaLabel } from "@/utils/concert/getBookingCtaLabel";
import { canBookConcert } from "@/utils/concert/canBookConcert";
import { hasSeatCounts } from "@/utils/concert/hasSeatCounts";
import GenreBadge from "./GenreBadge";
import SeatGauge from "./SeatGauge";
import samplePoster from "@/assets/images/sample-poster.svg";

/** 썸네일 우상단 소프트 칩 — Figma 마감임박과 동일 포맷 */
const THUMB_BADGE_BASE =
  "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold";

interface ConcertCardProps {
  concert: ConcertSummary;
}

function ConcertCard({ concert }: ConcertCardProps) {
  const navigate = useNavigate();

  const isCanceled = concert.status === "CANCELED";
  const seatsKnown = hasSeatCounts(concert);
  const remaining = seatsKnown ? concert.remainingSeats : null;
  const total = seatsKnown ? concert.totalSeats : 0;

  const canBook = canBookConcert({
    status: concert.status,
    remaining,
    surface: "list",
  });

  const isSoldOut =
    concert.status === "ON_SALE" && seatsKnown && remaining === 0;

  const buttonLabel = getBookingCtaLabel({
    status: concert.status,
    remaining,
    surface: "list",
  });

  const remainingPercent =
    seatsKnown && total > 0 ? (remaining! / total) * 100 : 0;
  const isEndingSoon =
    concert.status === "ON_SALE" &&
    seatsKnown &&
    remainingPercent > 0 &&
    remainingPercent <= 20;

  let thumbBadge: { label: string; tone: string } | null = null;
  if (isSoldOut) {
    thumbBadge = { label: "매진", tone: "bg-gray-500/10 text-gray-600" };
  } else if (isEndingSoon) {
    thumbBadge = { label: "마감임박", tone: "bg-danger/10 text-danger" };
  }

  const formattedPrice = concert.price.toLocaleString("ko-KR");

  const d = new Date(concert.showDate);
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const venueDisplay = concert.venue ?? concert.address ?? "";

  function handleClick() {
    navigate(`/concerts/${concert.id}`);
  }

  return (
    <article
      className="group rounded-xl overflow-hidden bg-white shadow-card hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-poster-fallback to-poster-fallback-end">
        <img
          src={concert.imageMainUrl || samplePoster}
          alt={`${concert.title} 포스터`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = samplePoster;
          }}
        />

        {isCanceled && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        )}

        {thumbBadge && (
          <div className="absolute top-3 right-3 z-[1]">
            <span className={`${THUMB_BADGE_BASE} ${thumbBadge.tone}`}>
              {thumbBadge.label}
            </span>
          </div>
        )}

        <div className="absolute bottom-2 left-2 z-[1]">
          <GenreBadge genre={concert.genre} />
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug min-h-[2.5rem]">
          {concert.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">{concert.performer}</p>

        <div className="space-y-1 text-xs text-gray-600">
          <p className="flex items-center gap-1.5 truncate">
            <MapPin size={14} className="shrink-0 text-gray-400" />
            <span className="truncate">{venueDisplay}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar size={14} className="shrink-0 text-gray-400" />
            <span>
              {formattedDate} {concert.showTime}
            </span>
          </p>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs text-gray-500">가격</span>
          <p className="text-base font-bold text-primary">₩{formattedPrice}</p>
        </div>

        <SeatGauge remaining={remaining} total={total} />

        <button
          type="button"
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
            canBook
              ? "bg-primary text-white hover:opacity-90"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          disabled={!canBook}
          onClick={(e) => {
            e.stopPropagation();
            if (!canBook) return;
            handleClick();
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}

export default memo(ConcertCard);
