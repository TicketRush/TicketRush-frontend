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
// - 2026-08-06 (이슈 #177):
//   - CLOSED/CANCELED/매진도 카드 클릭으로 상세 진입 허용 (예매 버튼만 비활성)
//   - 잔여 좌석 미확정 시 "0" 대신 "-", 게이지 숨김
// - 2026-08-07 (#178 리뷰):
//   - seatsReady에 shouldFetchSeats(ON_SALE) 포함
//     enabled=false여도 캐시가 있으면 옛 좌석 수/게이지가 보이던 문제 방지
// - 2026-08-07 (#178):
//   - 상태별 CTA 문구 (매진/예매 마감/공연 취소/오픈 예정)
//   - ON_SALE 미확정 시 CTA「잔여 좌석 확인 중」(Sidebar와 동일)
//   - 썸네일 우상단 소프트 칩 (매진 / 마감임박) — 목록 bookingOpenAt 미사용
//   - CANCELED만 썸네일 dim (뱃지 없음)
// - 2026-08-07 (#178 보완):
//   - CTA 문구는 getBookingCtaLabel 공통 헬퍼 사용
//
// ⚠️ N+1 문제 우려: 각 카드마다 useSeatCounts 호출 = 목록 8개면 8개 API 호출.
// React Query 캐시로 중복 억제되긴 하지만, 실제 트래픽 부담이 크면
// 백엔드에 batch endpoint (e.g. POST /seat-counts?ids=1,2,3) 요청 고려.
import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import type { ConcertSummary } from "@/types/domain/concert";
import { useSeatCounts } from "@/hooks/queries/useSeats";
import { getBookingCtaLabel } from "@/utils/concert/getBookingCtaLabel";
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

  // Detail과 동일: ON_SALE일 때만 seat-counts 조회 (#178 리뷰)
  // seatsReady에도 포함해야 enabled=false + 캐시 hit 시 옛 숫자가 안 보임
  const shouldFetchSeats = concert.status === "ON_SALE";
  const {
    data: seatCounts,
    isLoading: seatCountsLoading,
    isError: seatCountsError,
  } = useSeatCounts(concert.id, shouldFetchSeats);

  const seatsReady =
    shouldFetchSeats &&
    !!seatCounts &&
    !seatCountsLoading &&
    !seatCountsError;

  // 확정된 잔여만 숫자로 사용. 미확정(로딩/실패/미호출)은 null → UI에서 "-"
  const remaining = seatsReady ? seatCounts.availableCount : null;
  const total = seatsReady
    ? seatCounts.totalCount
    : (concert.totalSeats ?? 0);

  // 예매 CTA 활성: ON_SALE + seat-counts 성공 + availableCount > 0
  const canBook =
    seatsReady && concert.status === "ON_SALE" && (remaining ?? 0) > 0;

  // ON_SALE + 잔여 0 (기술적 매진). CLOSED/CANCELED와 구분
  const isSoldOut = seatsReady && remaining === 0;

  const buttonLabel = getBookingCtaLabel({
    status: concert.status,
    seatsLoading: seatCountsLoading,
    seatsError: seatCountsError,
    remaining,
  });

  const remainingPercent =
    seatsReady && remaining !== null && total > 0
      ? (remaining / total) * 100
      : 0;
  const isEndingSoon =
    canBook && remainingPercent > 0 && remainingPercent <= 20;

  // 썸네일 우상단: 매진 / 마감임박 (D-N은 목록 API 필드 없어 미사용)
  let thumbBadge: { label: string; tone: string } | null = null;
  if (isSoldOut) {
    thumbBadge = { label: "매진", tone: "bg-gray-500/10 text-gray-600" };
  } else if (isEndingSoon) {
    thumbBadge = { label: "마감임박", tone: "bg-danger/10 text-danger" };
  }

  const formattedPrice = concert.price.toLocaleString("ko-KR");

  const d = new Date(concert.showDate);
  const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // venue fallback: venue > address
  const venueDisplay = concert.venue ?? concert.address ?? "";

  // 상세는 상태와 무관하게 진입 가능. 예매만 canBook으로 제어 (#177)
  function handleClick() {
    navigate(`/concerts/${concert.id}`);
  }

  return (
    <article
      className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
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

        {/* CANCELED만 썸네일 dim (살짝만 — 포스터 가독성 유지) */}
        {isCanceled && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        )}

        {/* 우상단 소프트 칩: 매진 / 마감임박 */}
        {thumbBadge && (
          <div className="absolute top-3 right-3 z-[1]">
            <span className={`${THUMB_BADGE_BASE} ${thumbBadge.tone}`}>
              {thumbBadge.label}
            </span>
          </div>
        )}

        {/* 장르 뱃지 (좌하단) */}
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

        {/* 가격 (라벨 좌측, 금액 우측) */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs text-gray-500">가격</span>
          <p className="text-base font-bold text-primary">₩{formattedPrice}</p>
        </div>

        {/* 잔여 좌석: 확정 시 숫자+게이지, 미확정 시 "-" */}
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
            // 카드 클릭(상세)과 분리 — 예매 가능 시에만 동일 진입 허용
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
