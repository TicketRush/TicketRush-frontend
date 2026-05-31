import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import type { ConcertSummary } from "../../api/types/domain/concert";
import GenreBadge from "./GenreBadge";
import SeatGauge from "./SeatGauge";
import samplePoster from "@/assets/images/sample-poster.svg";

interface ConcertCardProps {
  concert: ConcertSummary;
}

function ConcertCard({ concert }: ConcertCardProps) {
  const navigate = useNavigate();
  const isSoldOut =
    concert.status === "SOLD_OUT" || concert.remainingSeats === 0;
  const remainingPercent =
    concert.totalSeats > 0
      ? (concert.remainingSeats / concert.totalSeats) * 100
      : 0;
  const isEndingSoon = !isSoldOut && remainingPercent <= 20;

  const formattedPrice = concert.price.toLocaleString("ko-KR");

  const d = new Date(concert.date);
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function handleClick() {
    if (!isSoldOut) navigate(`/concerts/${concert.id}`);
  }

  return (
    <article
      className={`group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isSoldOut ? "" : "cursor-pointer"
      }`}
      onClick={handleClick}
      role="link"
      tabIndex={isSoldOut ? -1 : 0}
      onKeyDown={(e) => {
        if (!isSoldOut && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={concert.posterUrl || samplePoster}
          alt={`${concert.title} 포스터`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = samplePoster;
          }}
        />

        {/* 마감임박 뱃지 (우상단) */}
        {isEndingSoon && (
          <div className="absolute top-2 right-2">
            <span className="inline-block px-2 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-600">
              마감임박
            </span>
          </div>
        )}

        {/* 장르 뱃지 (좌하단) */}
        <div className="absolute bottom-2 left-2">
          <GenreBadge genre={concert.genre} />
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug min-h-[2.5rem]">
          {concert.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">{concert.artist}</p>

        <div className="space-y-1 text-xs text-gray-600">
          <p className="flex items-center gap-1.5 truncate">
            <MapPin size={14} className="shrink-0 text-gray-400" />
            <span className="truncate">{concert.venue}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar size={14} className="shrink-0 text-gray-400" />
            <span>
              {formattedDate} {concert.time}
            </span>
          </p>
        </div>

        {/* 가격 (라벨 좌측, 금액 우측) */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs text-gray-500">가격</span>
          <p className="text-base font-bold text-primary">₩{formattedPrice}</p>
        </div>

        <SeatGauge
          remaining={concert.remainingSeats}
          total={concert.totalSeats}
        />

        <button
          type="button"
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
            isSoldOut
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-primary text-white hover:opacity-90"
          }`}
          disabled={isSoldOut}
          onClick={(e) => {
            e.stopPropagation();
            if (!isSoldOut) handleClick();
          }}
        >
          {isSoldOut ? "예매불가" : "예매하기"}
        </button>
      </div>
    </article>
  );
}

export default memo(ConcertCard);
