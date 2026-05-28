// src/components/mypage/BookingCard.tsx
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, AlertCircle } from "lucide-react";
import type { BookingListItem, BookingTab } from "@/types/domain/booking";
import { toShowDateTime } from "@/utils/booking";

interface BookingCardProps {
  booking: BookingListItem;
  tab: BookingTab;
}

/**
 * 예매 내역 단일 카드
 *
 * ─ 운영 정책 ─
 * [상태 태그 디자인]
 *  - 예매 확정(CONFIRMED): #00C950
 *  - 취소됨(CANCELLED)/기타: #FB2C36
 *
 * [환불 정책]
 *  - 공연 7일 전까지: [환불 신청] 활성화
 *  - 공연 7일 미만: "환불 불가 (D-7 미만)" 비활성화
 *
 * [표시 기능 — 지난 공연(past 탭)]
 *  - 환불 신청 버튼 미노출 (지난 공연은 환불 기능 제공하지 않음)
 *
 * [티켓 조회 정책]
 *  - 티켓 보기 클릭 → 예매 상세/티켓 페이지 이동
 */
export function BookingCard({ booking, tab }: BookingCardProps) {
  const navigate = useNavigate();

  // 공연 시작시각 = performanceDate + performanceTime
  const showDateTime = toShowDateTime(
    booking.performanceDate,
    booking.performanceTime,
  );

  // ─ 환불 가능 여부 계산 (D-7 기준) ─
  const now = new Date();
  const msUntilShow = showDateTime.getTime() - now.getTime();
  const daysUntilShow = msUntilShow / (1000 * 60 * 60 * 24);
  const isRefundable = daysUntilShow >= 7 && booking.status === "CONFIRMED";

  // ─ 지난 공연 여부 ─
  const isPastTab = tab === "past";

  // ─ 상태 뱃지 ─
  const statusBadge =
    booking.status === "CONFIRMED"
      ? { label: "예매 확정", bg: "bg-[#00C950]/15", text: "text-[#00C950]" }
      : booking.status === "CANCELLED"
        ? { label: "취소됨", bg: "bg-[#FB2C36]/15", text: "text-[#FB2C36]" }
        : booking.status === "PENDING"
          ? { label: "결제 대기", bg: "bg-amber-100", text: "text-amber-700" }
          : { label: "만료됨", bg: "bg-gray-100", text: "text-gray-500" };

  // ─ 핸들러 ─
  const handleViewTicket = () => {
    navigate(`/reservations/mypage/${booking.bookingNumber}`);
  };

  const handleRefund = () => {
    // TODO: Sprint 9 환불 모달 연동 (Feat #27)
    if (window.confirm("정말 환불을 신청하시겠습니까?")) {
      // refundMutation.mutate(booking.bookingNumber);
    }
  };

  // ─ 포맷팅 ─
  const formatShowDateTime = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-6">
      {/* ─── 상단: 공연명 + 상태 뱃지 + 예매번호 ─── */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-gray-900">
            {booking.performanceTitle}
          </h3>
          <span
            className={`text-xs px-2.5 py-1 rounded font-medium ${statusBadge.bg} ${statusBadge.text}`}
          >
            {statusBadge.label}
          </span>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-xs text-gray-500">예매번호</p>
          <p className="text-sm font-medium text-gray-900">
            {booking.bookingNumber}
          </p>
        </div>
      </div>

      {/* ─── 공연 일시 / 장소 ─── */}
      <div className="space-y-1 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{formatShowDateTime(showDateTime)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>{booking.performanceVenue}</span>
        </div>
      </div>

      {/* ─── 좌석 / 결제 금액 / 예매일 박스 ─── */}
      <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-2">좌석</p>
          {/* 1인 1석 — 단일 좌석 라벨 */}
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white font-medium">
            {booking.seatLabel}
          </span>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">결제 금액</p>
          <p className="text-base font-bold text-primary">
            ₩{booking.price.toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">예매일</p>
          <p className="text-sm text-gray-900">
            {formatShowDateTime(new Date(booking.createdAt))}
          </p>
        </div>
      </div>

      {/* ─── 액션 버튼 ─── */}
      {isPastTab ? (
        // 지난 공연: 티켓 보기만 (운영 정책: 환불 기능 제공 X)
        // 단, 취소된 예매는 티켓 보기도 비활성
        booking.status === "CANCELLED" ? null : (
          <button
            type="button"
            onClick={handleViewTicket}
            className="w-full flex items-center justify-center gap-2
                       border border-primary text-primary
                       py-3 rounded-lg font-medium hover:bg-primary/5 transition-colors"
          >
            <Ticket className="w-4 h-4" />
            티켓 보기
          </button>
        )
      ) : (
        // 예정된 공연: 티켓 보기 + 환불 신청 (조건부)
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleViewTicket}
            disabled={booking.status === "CANCELLED"}
            className="flex items-center justify-center gap-2
                       bg-primary text-white
                       py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors
                       disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Ticket className="w-4 h-4" />
            티켓 보기
          </button>

          {isRefundable ? (
            <button
              type="button"
              onClick={handleRefund}
              className="flex items-center justify-center gap-2
                         border border-[#FB2C36] text-[#FB2C36]
                         py-3 rounded-lg font-medium hover:bg-[#FB2C36]/5 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              환불 신청
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2
                         border border-[#DFE6E9] bg-[#DFE6E9]/20 text-[#DFE6E9]
                         py-3 rounded-lg font-medium cursor-not-allowed"
            >
              <AlertCircle className="w-4 h-4" />
              {booking.status === "CANCELLED"
                ? "취소된 예매"
                : "환불 불가 (D-7 미만)"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
