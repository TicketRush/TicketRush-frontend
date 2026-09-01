// 공연 상세 페이지 우측 sticky 사이드바
//
// 변경 이력:
// - 2026-07-15 (이슈 #121 fix):
//   - ConcertStatus 값 정정: "SOLD_OUT" → "CLOSED"/"CANCELED"
//     매진 판단은 여전히 remaining === 0으로도 유도 (기술적 매진)
//   - buttonLabel 로직 정정
// - 2026-08-02 (#134 리뷰):
//   - seat-counts 로딩/실패 시 예매 비활성 + 안내 문구
// - 2026-08-05 (#134 리뷰):
//   - UPCOMING → "오픈 예정" (예매 종료로 묶지 않음)
// - 2026-08-06 (이슈 #177):
//   - 잔여 미확정(null) 시 "-" 표시, 게이지/% 숨김
//   - CLOSED/CANCELED/UPCOMING 상태별 버튼·주의 문구·배경색
// - 2026-08-07 (#178):
//   - 버튼 라벨을 status 기준으로 분기 (isOnSale/canBook은 disabled만)
//     ON_SALE + 좌석 미확정 순간이 "예매 종료"로 떨어지지 않게 함
// - 2026-08-07 (#178 보완):
//   - 매진 게이지 색을 SeatGauge와 동일(primary)로 통일
//   - 잔여 미확정 시에도 게이지·% 줄 높이 슬롯 유지 (레이아웃 점프 방지)
//   - CTA 문구는 getBookingCtaLabel 공통 헬퍼 사용
// - 2026-08-07 (#178 보완2):
//   - ON_SALE 매진/로딩/실패 시 5분 타이머 안내 대신 상태 맞춤 문구
//   - bookingOpenAt 포맷을 Asia/Seoul 기준으로 통일
// - 2026-08-27 (이슈 #98):
//   - sticky top-16 (헤더 아래), 예매 정보/유의사항 shadow-card + border-2
//   - 관람 시간·상태 안내 박스 border-2 (CTA/좌석 로직 유지)
//   - 모바일 order-2로 제목 바로 아래, 데스크톱은 우측 row-span sticky
// - 2026-08-31 (이슈 #203):
//   - 게이지는 목록 캐시 우선, 없으면 seat-counts. CTA는 availableCount
import { Ticket, AlertTriangle, Info } from "lucide-react";
import type { ConcertStatus } from "@/types/domain/concert";
import { formatBookingOpenAt } from "@/utils/concert/formatBookingOpenAt";
import { getBookingCtaLabel } from "@/utils/concert/getBookingCtaLabel";

interface BookingSidebarProps {
  /** 상세 게이지 잔여. null이면 `-` (#203) */
  gaugeRemaining: number | null;
  gaugeTotal: number;
  /** seat-counts availableCount. CTA·안내 문구용 (#181) */
  remaining: number | null;
  price: number;
  duration: number;
  isOnSale: boolean;
  status: ConcertStatus;
  /** UPCOMING 티켓 오픈 시각 (ISO). 없으면 오픈일 미정 안내 */
  bookingOpenAt?: string | null;
  /** seat-counts 로딩 중 — 예매 비활성 */
  seatsLoading?: boolean;
  /** seat-counts 실패 — 예매 비활성 + 안내 */
  seatsError?: boolean;
  notices: string[];
  onBooking: () => void;
}

type NoticeTone = "default" | "muted" | "danger" | "success";

function getStatusNotice(
  status: ConcertStatus,
  bookingOpenAt?: string | null,
  seatsLoading = false,
  seatsError = false,
  remaining: number | null = null,
): { message: string; tone: NoticeTone } | null {
  if (status === "CLOSED") {
    return {
      message: "본 공연은 예매가 마감되었습니다.",
      tone: "muted",
    };
  }
  if (status === "CANCELED") {
    return {
      message: "본 공연은 기획사 사정으로 취소되었습니다.",
      tone: "danger",
    };
  }
  if (status === "UPCOMING") {
    const formatted = bookingOpenAt ? formatBookingOpenAt(bookingOpenAt) : "";
    return {
      message: formatted
        ? `본 공연은 ${formatted}에 티켓 오픈됩니다.`
        : "본 공연의 티켓 오픈일이 곧 공개됩니다.",
      tone: "success",
    };
  }

  if (status === "ON_SALE") {
    if (seatsError) {
      return {
        message: "잔여 좌석 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        tone: "muted",
      };
    }
    if (seatsLoading || remaining === null) {
      return {
        message: "잔여 좌석을 확인하고 있습니다.",
        tone: "muted",
      };
    }
    if (remaining === 0) {
      return {
        message: "본 공연은 매진되었습니다.",
        tone: "muted",
      };
    }
    return {
      message: "좌석 선택 후 5분의 제한 시간이 적용됩니다.",
      tone: "default",
    };
  }

  return null;
}

const NOTICE_STYLES: Record<
  NoticeTone,
  { box: string; icon: string; text: string }
> = {
  default: {
    box: "bg-warning-bg border-2 border-warning-border",
    icon: "text-yellow-700",
    text: "text-yellow-800",
  },
  muted: {
    box: "bg-gray-100 border-2 border-gray-200",
    icon: "text-gray-600",
    text: "text-gray-700",
  },
  danger: {
    box: "bg-red-50 border-2 border-red-200",
    icon: "text-red-600",
    text: "text-red-800",
  },
  success: {
    box: "bg-green-50 border-2 border-green-200",
    icon: "text-green-700",
    text: "text-green-800",
  },
};

export default function BookingSidebar({
  gaugeRemaining,
  gaugeTotal,
  remaining,
  price,
  duration,
  isOnSale,
  status,
  bookingOpenAt = null,
  seatsLoading = false,
  seatsError = false,
  notices,
  onBooking,
}: BookingSidebarProps) {
  const gaugeConfirmed = gaugeRemaining !== null;
  const percent =
    gaugeConfirmed && gaugeTotal > 0
      ? (gaugeRemaining / gaugeTotal) * 100
      : 0;
  const isEndingSoon =
    gaugeConfirmed &&
    gaugeRemaining > 0 &&
    percent > 0 &&
    percent <= 20;
  const showGauge = gaugeConfirmed && gaugeTotal > 0;

  const buttonLabel = getBookingCtaLabel({
    status,
    seatsLoading,
    seatsError,
    remaining,
  });

  const statusNotice = getStatusNotice(
    status,
    bookingOpenAt,
    seatsLoading,
    seatsError,
    remaining,
  );
  const noticeStyle = statusNotice
    ? NOTICE_STYLES[statusNotice.tone]
    : NOTICE_STYLES.default;
  const NoticeIcon =
    statusNotice?.tone === "success" || statusNotice?.tone === "muted"
      ? Info
      : AlertTriangle;

  return (
    <div className="order-2 space-y-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-16">
      <div className="bg-white border-2 border-border rounded-xl p-5 space-y-4 shadow-card">
        <h3 className="font-bold">예매 정보</h3>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-text-secondary">잔여 좌석</span>
            <div className="flex items-baseline gap-0.5">
              {!gaugeConfirmed ? (
                <span className="text-3xl font-bold text-text-secondary">
                  -
                </span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-text">
                    {gaugeRemaining}
                  </span>
                  <span className="text-xs text-text-secondary">
                    /{gaugeTotal}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 게이지: 확정 시 바 표시, 미확정 시 높이 슬롯만 유지 */}
          {showGauge ? (
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isEndingSoon ? "bg-danger" : "bg-primary"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : (
            <div className="w-full h-1" aria-hidden />
          )}
          <p className="text-[10px] text-text-secondary mt-1">
            {showGauge ? `${Math.round(percent)}% 잔여` : "\u00A0"}
          </p>
        </div>

        <div className="border-2 border-primary rounded-lg p-3 bg-primary/5">
          <p className="text-xs text-text-secondary">1인 가격</p>
          <p className="text-2xl font-bold text-primary mt-0.5">
            ₩{price.toLocaleString()}
          </p>
        </div>

        <div className="border-2 border-border rounded-lg p-3 bg-white flex items-center justify-between">
          <span className="text-xs text-text-secondary">관람 시간</span>
          <span className="text-sm font-semibold">{duration}분</span>
        </div>

        <button
          type="button"
          onClick={onBooking}
          disabled={!isOnSale}
          className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
            isOnSale
              ? "bg-primary text-white hover:opacity-90"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Ticket size={16} />
          {buttonLabel}
        </button>

        {statusNotice && (
          <div
            className={`rounded-lg p-3 flex items-start gap-2 ${noticeStyle.box}`}
          >
            <NoticeIcon
              size={14}
              className={`${noticeStyle.icon} mt-0.5 shrink-0`}
            />
            <p className={`text-xs leading-relaxed ${noticeStyle.text}`}>
              {statusNotice.tone === "default" ? (
                <>
                  <span className="font-bold">예매 시 주의:</span>{" "}
                  {statusNotice.message}
                </>
              ) : (
                statusNotice.message
              )}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-border rounded-xl p-4 shadow-card">
        <ul className="text-xs text-text-secondary space-y-1.5">
          {notices.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-primary shrink-0">•</span>
              <span className="leading-relaxed">{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
