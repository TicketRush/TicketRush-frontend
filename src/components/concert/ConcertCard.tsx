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
// - 2026-07-15 (이슈 #122 정리):
//   - useSeatCounts import 경로 정정: @/hooks/queries/useSeats
//     (별도 useSeatCounts.ts 파일은 중복이므로 삭제 예정)
//
// ⚠️ N+1 문제 우려: 각 카드마다 useSeatCounts 호출 = 목록 8개면 8개 API 호출.
// React Query 캐시로 중복 억제되긴 하지만, 실제 트래픽 부담이 크면
// 백엔드에 batch endpoint (e.g. POST /seat-counts?ids=1,2,3) 요청 고려.
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import type { ConcertSummary } from "@/types/domain/concert";
import { useSeatCounts } from "@/hooks/queries/useSeats";
import GenreBadge from "./GenreBadge";
import SeatGauge from "./SeatGauge";
import samplePoster from "@/assets/images/sample-poster.svg";

interface ConcertCardProps {
  concert: ConcertSummary;
}

function ConcertCard({ concert }: ConcertCardProps) {
  const navigate = useNavigate();

  // 실 API로 잔여 좌석 조회 (실패/로딩 시 mock 값 fallback)
  const { data: seatCounts } = useSeatCounts(concert.id);

  // 잔여 좌석 우선순위: seatCounts (실 API) > concert.remainingSeats (mock)
  const remaining = seatCounts?.availableCount ?? concert.remainingSeats ?? 0;
  const total = seatCounts?.totalCount ?? concert.totalSeats ?? 0;

  // 매진 판단:
  //   1. status가 CLOSED/CANCELED → 무조건 예매 불가
  //   2. 잔여 좌석 0 → 매진 (기술적 매진)
  const isUnavailable =
    concert.status === "CLOSED" || concert.status === "CANCELED";
  const isSoldOut = isUnavailable || (total > 0 && remaining === 0);

  const remainingPercent = total > 0 ? (remaining / total) * 100 : 0;
  const isEndingSoon =
    !isSoldOut && remainingPercent > 0 && remainingPercent <= 20;

  const formattedPrice = concert.price.toLocaleString("ko-KR");

  const d = new Date(concert.showDate);
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // venue fallback: venue > address
  const venueDisplay = concert.venue ?? concert.address ?? "";

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
          src={concert.imageMainUrl || samplePoster}
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

        {/* 가격 (라벨 좌측, 금액 우측) */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs text-gray-500">가격</span>
          <p className="text-base font-bold text-primary">₩{formattedPrice}</p>
        </div>

        {/* 좌석 게이지 - 총 좌석 수 없으면 표시 안 함 */}
        {total > 0 && <SeatGauge remaining={remaining} total={total} />}

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
