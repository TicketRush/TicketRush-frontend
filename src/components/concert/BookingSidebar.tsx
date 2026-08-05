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
import { Ticket, AlertTriangle } from "lucide-react";
import type { ConcertStatus } from "@/types/domain/concert";

interface BookingSidebarProps {
  remaining: number;
  total: number;
  price: number;
  duration: number;
  isOnSale: boolean;
  status: ConcertStatus;
  /** seat-counts 로딩 중 — 예매 비활성 */
  seatsLoading?: boolean;
  /** seat-counts 실패 — 예매 비활성 + 안내 */
  seatsError?: boolean;
  notices: string[];
  onBooking: () => void;
}

export default function BookingSidebar({
  remaining,
  total,
  price,
  duration,
  isOnSale,
  status,
  seatsLoading = false,
  seatsError = false,
  notices,
  onBooking,
}: BookingSidebarProps) {
  const seatsPending = seatsLoading || seatsError;
  const percent =
    !seatsPending && total > 0 ? (remaining / total) * 100 : 0;

  // 매진 판단:
  //   status === "CLOSED" → 판매 종료 (매진 포함)
  //   status === "CANCELED" → 공연 취소
  //   remaining === 0 → 기술적 매진 (seat-counts 확정 후에만)
  const isUnavailable = status === "CLOSED" || status === "CANCELED";
  const isSoldOut = !seatsPending && (isUnavailable || remaining === 0);

  // buttonLabel:
  //   seat-counts 로딩 → "잔여 좌석 확인 중"
  //   seat-counts 실패 → "좌석 정보 확인 불가"
  //   UPCOMING → "오픈 예정"
  //   CANCELED → "취소된 공연"
  //   CLOSED or remaining === 0 → "매진"
  //   ON_SALE → "예매하기"
  //   그 외 → "예매 종료"
  let buttonLabel: string;
  if (seatsLoading) {
    buttonLabel = "잔여 좌석 확인 중";
  } else if (seatsError) {
    buttonLabel = "좌석 정보 확인 불가";
  } else if (status === "UPCOMING") {
    buttonLabel = "오픈 예정";
  } else if (status === "CANCELED") {
    buttonLabel = "취소된 공연";
  } else if (isSoldOut) {
    buttonLabel = "매진";
  } else if (isOnSale) {
    buttonLabel = "예매하기";
  } else {
    buttonLabel = "예매 종료";
  }

  return (
    <div className="lg:sticky lg:top-4 space-y-3">
      {/* 메인 박스 */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-bold">예매 정보</h3>

        {/* 잔여 좌석 + 게이지바 */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-text-secondary">잔여 좌석</span>
            <div className="flex items-baseline gap-0.5">
              {seatsPending ? (
                <span className="text-lg font-semibold text-text-secondary">
                  {seatsLoading ? "확인 중…" : "—"}
                </span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-text">
                    {remaining}
                  </span>
                  <span className="text-xs text-text-secondary">/{total}</span>
                </>
              )}
            </div>
          </div>
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isSoldOut ? "bg-danger" : "bg-primary"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-text-secondary mt-1">
            {seatsLoading
              ? "잔여 좌석을 확인하고 있습니다"
              : seatsError
                ? "잔여 좌석을 확인할 수 없습니다"
                : `${Math.round(percent)}% 잔여`}
          </p>
        </div>

        {/* 1인 가격 — 강조 박스 */}
        <div className="border-2 border-primary rounded-lg p-3 bg-primary/5">
          <p className="text-xs text-text-secondary">1인 가격</p>
          <p className="text-2xl font-bold text-primary mt-0.5">
            ₩{price.toLocaleString()}
          </p>
        </div>

        {/* 관람 시간 박스 */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-text-secondary">관람 시간</span>
          <span className="text-sm font-semibold">{duration}분</span>
        </div>

        {/* 예매 버튼 — seat-counts 확정 전에는 비활성 */}
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

        {/* 노란 경고 박스 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle
            size={14}
            className="text-yellow-700 mt-0.5 shrink-0"
          />
          <p className="text-xs text-yellow-800 leading-relaxed">
            <span className="font-bold">예매 시 주의:</span> 좌석 선택 후 5분의
            제한 시간이 적용됩니다.
          </p>
        </div>
      </div>

      {/* 유의사항 박스 */}
      <div className="bg-white border border-border rounded-xl p-4">
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
