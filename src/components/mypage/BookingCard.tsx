// src/components/mypage/BookingCard.tsx
//
// 백엔드 스펙 반영 변경:
//   - booking.seatNumber → booking.seatNumber
// 변경 이력 (이슈 #285):
//   - 환불·취소 확인을 window.confirm → 공통 Modal로 교체
// 변경 이력 (이슈 #338):
//   - 환불 신청이 DELETE /booking/{bookingNumber} 를 호출하고
//     성공 시 뱃지를 「환불 신청 완료」(REFUNDING)로 표시
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import type {
  BookingListItem,
  BookingStatus,
  BookingTab,
} from "@/types/domain/booking";
import {
  formatPaymentAmount,
  displayBookingText,
  formatPerformanceSchedule,
  isRefundableBooking,
  userBookingStatusLabel,
} from "@/utils/booking";
import { formatSeoulDateTime } from "@/utils/datetime/formatSeoulInstant";
import { useCancelBooking } from "@/hooks/mutations/useCancelBooking";
import { useRequestRefund } from "@/hooks/mutations/useRequestRefund";
import { ApiError } from "@/api/errors/errorMapper";
import { ERROR_CODES } from "@/api/errors/errorCodes";
import {
  isRefundDeadlinePassed,
  isRefundPerformanceUnavailable,
} from "@/utils/booking/userRefund";
import Modal from "@/components/common/Modal/Modal";

interface BookingCardProps {
  booking: BookingListItem;
  tab: BookingTab;
}

type ConfirmKind = "refund" | "cancel" | null;

const STATUS_BADGE: Record<BookingStatus, { bg: string; text: string }> = {
  CONFIRMED: {
    bg: "bg-[#00C950]/15",
    text: "text-[#00C950]",
  },
  PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  CANCELED: {
    bg: "bg-[#FB2C36]/15",
    text: "text-[#FB2C36]",
  },
  REFUNDING: {
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  REFUNDED: {
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
  EXPIRED: {
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
};

/**
 * 예매 내역 단일 카드
 *
 * ─ 운영 정책 ─
 * [상태 태그 디자인]
 *  - 예매 확정(CONFIRMED): #00C950
 *  - 취소됨(CANCELED)/기타: #FB2C36
 *
 * [환불 정책]
 *  - 공연 7일 전까지: [환불 신청] 활성화
 *  - 공연 7일 미만: "환불 불가 (D-7 미만)" 비활성화
 *  - 목록에 공연 시각이 없으면 날짜(자정 00:00이 아닌 달력 일수)로 계산
 *  - 서버가 마감(BOOKING_409_007)으로 거절하면 이번 세션에서 버튼을 끈다 (#370)
 *  - 공연 정보 503은 한 번 더 실패하면 이번 세션에서 버튼을 끈다 (#370)
 *
 * [표시 기능 — 지난 공연(past 탭)]
 *  - 환불 신청 버튼 미노출 (지난 공연은 환불 기능 제공하지 않음)
 *
 * [티켓 조회 정책]
 *  - 티켓 보기 클릭 → 예매 상세/티켓 페이지 이동
 */
export function BookingCard({ booking, tab }: BookingCardProps) {
  const navigate = useNavigate();
  const cancelBooking = useCancelBooking();
  const requestRefund = useRequestRefund();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [deadlineBlocked, setDeadlineBlocked] = useState(false);
  const [lookupBlocked, setLookupBlocked] = useState(false);

  const refundClosed =
    deadlineBlocked || isRefundDeadlinePassed(booking.bookingNumber);
  const lookupClosed =
    lookupBlocked || isRefundPerformanceUnavailable(booking.bookingNumber);
  const isRefundable =
    isRefundableBooking(booking) && !refundClosed && !lookupClosed;

  // ─ 지난 공연 여부 ─
  const isPastTab = tab === "past";

  const status = booking.status;
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE.EXPIRED;
  const confirmPending =
    (confirmKind === "cancel" && cancelBooking.isPending) ||
    (confirmKind === "refund" && requestRefund.isPending);

  // ─ 핸들러 ─
  const handleViewTicket = () => {
    navigate(`/reservations/mypage/${booking.bookingNumber}`);
  };

  function handleCloseConfirm() {
    if (confirmPending) return;
    setConfirmKind(null);
  }

  async function handleConfirmAction() {
    if (confirmKind === "refund") {
      try {
        await requestRefund.mutateAsync(booking.bookingNumber);
        toast.success("환불 신청이 완료되었습니다.");
        setConfirmKind(null);
      } catch (error) {
        // 세션 기록은 requestRefundApi가 토스트보다 먼저 해 둔다 (#370).
        if (
          error instanceof ApiError &&
          error.code === ERROR_CODES.BOOKING_REFUND_DEADLINE_PASSED
        ) {
          setDeadlineBlocked(true);
          setConfirmKind(null);
          return;
        }
        if (
          error instanceof ApiError &&
          error.code === ERROR_CODES.BOOKING_PERFORMANCE_COMMUNICATION_FAILED &&
          isRefundPerformanceUnavailable(booking.bookingNumber)
        ) {
          setLookupBlocked(true);
          setConfirmKind(null);
          return;
        }
        // 첫 503과 그 외는 mutationCache.onError가 토스트.
        // 확인 창은 열어 다시 시도할 수 있게 둔다.
      }
      return;
    }

    if (confirmKind !== "cancel") return;

    try {
      await cancelBooking.mutateAsync(booking.bookingNumber);
      toast.info("예매를 취소했습니다.");
      setConfirmKind(null);
    } catch {
      // mutationCache.onError가 토스트. 모달은 열어 재시도할 수 있게 둔다.
    }
  }

  const createdAtLabel = formatSeoulDateTime(booking.createdAt);
  const showDateLabel = formatPerformanceSchedule(
    booking.performanceDate,
    booking.performanceTime,
  );

  const isTerminal =
    status === "CANCELED" ||
    status === "EXPIRED" ||
    status === "REFUNDED";

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-6">
      {/* ─── 상단: 공연명 + 상태 뱃지 + 예매번호 ─── */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-gray-900">
            {displayBookingText(booking.performanceTitle)}
          </h3>
          <span
            className={`text-xs px-2.5 py-1 rounded font-medium ${statusBadge.bg} ${statusBadge.text}`}
          >
            {userBookingStatusLabel(status)}
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
          <span>{showDateLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>{displayBookingText(booking.performanceVenue)}</span>
        </div>
      </div>

      {/* ─── 좌석 / 결제 금액 / 예매일 박스 ─── */}
      <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-2">좌석</p>
          {/* 1인 1석 — 단일 좌석 번호 */}
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white font-medium">
            {displayBookingText(booking.seatNumber)}
          </span>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">결제 금액</p>
          <p className="text-base font-bold text-primary">
            {formatPaymentAmount(booking.price)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">예매일</p>
          <p className="text-sm text-gray-900">{createdAtLabel}</p>
        </div>
      </div>

      {/* ─── 액션 버튼 ─── */}
      {status === "PENDING" ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleViewTicket}
            className="flex items-center justify-center gap-2
                       bg-primary text-white
                       py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Ticket className="w-4 h-4" />
            예매 이어가기
          </button>
          <button
            type="button"
            onClick={() => setConfirmKind("cancel")}
            disabled={cancelBooking.isPending}
            className="flex items-center justify-center gap-2
                       border border-[#FB2C36] text-[#FB2C36]
                       py-3 rounded-lg font-medium hover:bg-[#FB2C36]/5 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <AlertCircle className="w-4 h-4" />
            {cancelBooking.isPending ? "취소 중..." : "예매 취소"}
          </button>
        </div>
      ) : isPastTab ? (
        // 지난 공연: 티켓 보기만 (운영 정책: 환불 기능 제공 X)
        // 단, 종료 상태 예매는 티켓 보기도 비활성
        isTerminal ? null : (
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
            disabled={isTerminal}
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
              onClick={() => setConfirmKind("refund")}
              disabled={requestRefund.isPending}
              className="flex items-center justify-center gap-2
                         border border-[#FB2C36] text-[#FB2C36]
                         py-3 rounded-lg font-medium hover:bg-[#FB2C36]/5 transition-colors
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <AlertCircle className="w-4 h-4" />
              {requestRefund.isPending ? "신청 중..." : "환불 신청"}
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
              {status === "CANCELED"
                ? "취소된 예매"
                : status === "REFUNDING"
                  ? "환불 신청 완료"
                  : status === "REFUNDED"
                    ? "환불 완료"
                    : status === "EXPIRED"
                      ? "만료된 예매"
                      : lookupClosed
                        ? "환불 불가"
                        : booking.performanceDate?.trim()
                          ? "환불 불가 (D-7 미만)"
                          : "환불 불가"}
            </button>
          )}
        </div>
      )}

      <Modal
        isOpen={confirmKind !== null}
        onClose={handleCloseConfirm}
        title={
          confirmKind === "refund"
            ? "정말 환불을 신청하시겠습니까?"
            : "결제 대기 예매를 취소할까요?"
        }
        size="sm"
        disableOverlayClose={confirmPending}
        disableEscClose={confirmPending}
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseConfirm}
              disabled={confirmPending}
              className="px-4 py-2 rounded border border-border text-text-secondary disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmAction()}
              disabled={confirmPending}
              className="px-4 py-2 rounded bg-[#FB2C36] text-white font-semibold disabled:opacity-60"
            >
              {confirmKind === "refund"
                ? confirmPending
                  ? "신청 중..."
                  : "환불 신청"
                : confirmPending
                  ? "취소 중..."
                  : "예매 취소"}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          {confirmKind === "refund"
            ? "환불 신청 후 처리 결과는 예매 상태에서 확인할 수 있습니다."
            : "취소하면 선택했던 좌석이 다시 예매 가능해집니다."}
        </p>
      </Modal>
    </article>
  );
}
