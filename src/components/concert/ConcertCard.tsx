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
// - 2026-08-05 (#134 리뷰):
//   - seat-counts 로딩/실패 시 mock fallback으로 예매 CTA를 열지 않음
//   - UPCOMING → "오픈 예정" / 비활성 (BE 생성 시 기본 상태)
//   - ON_SALE + 조회 성공 + availableCount > 0 일 때만 "예매하기"
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

  const isClosedOrCanceled =
    concert.status === "CLOSED" || concert.status === "CANCELED";
  const isUpcoming = concert.status === "UPCOMING";

  // CLOSED/CANCELED/UPCOMING → 예매 불가이므로 seat-counts 생략
  //   (UPCOMING은 오픈 전이라 잔여 좌석이 CTA에 쓰이지 않음)
  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isError: seatCountsError,
  } = useSeatCounts(concert.id, !isClosedOrCanceled && !isUpcoming);

  const seatsReady =
    !!seatCounts && !seatCountsLoading && !seatCountsError;

  // 좌석 수: 확정 전에는 0 (fallback으로 예매를 열지 않음)
  const remaining = isClosedOrCanceled
    ? 0
    : seatsReady
      ? seatCounts.availableCount
      : 0;
  const total = seatsReady
    ? seatCounts.totalCount
    : (concert.totalSeats ?? 0);

  // 예매 CTA 활성: ON_SALE + seat-counts 성공 + availableCount > 0
  const canBook =
    seatsReady && concert.status === "ON_SALE" && remaining > 0;

  const isSoldOutConfirmed =
    isClosedOrCanceled || (seatsReady && remaining === 0);

  let buttonLabel: string;
  if (isUpcoming) {
    buttonLabel = "오픈 예정";
  } else if (seatCountsLoading) {
    buttonLabel = "잔여 좌석 확인 중";
  } else if (seatCountsError) {
    buttonLabel = "좌석 정보 확인 불가";
  } else if (isSoldOutConfirmed) {
    buttonLabel = "예매불가";
  } else if (canBook) {
    buttonLabel = "예매하기";
  } else {
    buttonLabel = "예매불가";
  }

  const remainingPercent = seatsReady && total > 0 ? (remaining / total) * 100 : 0;
  const isEndingSoon =
    canBook && remainingPercent > 0 && remainingPercent <= 20;

  const formattedPrice = concert.price.toLocaleString("ko-KR");

  const d = new Date(concert.showDate);
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // venue fallback: venue > address
  const venueDisplay = concert.venue ?? concert.address ?? "";

  // 상세 이동: 종료/취소·확정 매진만 막고, UPCOMING/로딩/실패는 상세에서 재확인 가능
  function canNavigateToDetail() {
    if (isClosedOrCanceled) return false;
    if (seatsReady && concert.status === "ON_SALE" && remaining === 0) {
      return false;
    }
    return true;
  }

  function handleClick() {
    if (!canNavigateToDetail()) return;
    navigate(`/concerts/${concert.id}`);
  }

  const clickable = canNavigateToDetail();

  return (
    <article
      className={`group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${
        clickable ? "cursor-pointer" : ""
      }`}
      onClick={handleClick}
      role="link"
      tabIndex={clickable ? 0 : -1}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
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

        {/* 좌석 게이지 — seat-counts 확정 + 총석 있을 때만 */}
        {seatsReady && total > 0 && (
          <SeatGauge remaining={remaining} total={total} />
        )}

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
            if (canBook) handleClick();
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}

export default memo(ConcertCard);
