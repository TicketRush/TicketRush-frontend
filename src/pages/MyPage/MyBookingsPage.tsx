// 마이페이지 — 내 예매 목록 + 환불 확인 모달
//
// ⚠️ 사용자 컴포넌트 가정:
//    - BookingCard: { booking: BookingListItem, onClick, onCancel? }
//    - BookingTabs: { value, onChange } — 탭 컴포넌트
//    - Modal: { open, onClose, title?, children }
//    - ProfileCard: { user } — 필요 시 표시

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useMyBookings } from "@/hooks/queries/useMyBookings";
import { useCancelBooking } from "@/hooks/mutations/useCancelBooking";
import Button from "@/components/common/Button/Button";
import { BookingCard } from "@/components/mypage/BookingCard";
import { BookingTabs } from "@/components/mypage/BookingTabs";
import Modal from "@/components/common/Modal/Modal";
import type { BookingStatus, BookingListItem } from "@/types/domain/booking";

type Tab = BookingStatus | "ALL";

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("ALL");
  const [cancelTarget, setCancelTarget] = useState<BookingListItem | null>(
    null,
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyBookings({ status: tab });

  const cancelMutation = useCancelBooking();

  // 무한 스크롤
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = data?.pages.flatMap((p) => p.items) ?? [];

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.bookingNumber);
      toast.success("예매가 취소되었습니다.");
      setCancelTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "예매 취소에 실패했습니다.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white border border-border rounded-xl p-6">
        <h1 className="font-bold">내 예매 내역</h1>
      </div>

      {/* 탭 — BookingTabs 시그니처를 모르면 임시로 직접 렌더 */}
      <div className="bg-white border border-border rounded-xl p-2 flex gap-1">
        {(["ALL", "CONFIRMED", "PENDING", "CANCELLED"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 text-sm rounded-lg transition ${
              tab === t
                ? "bg-primary text-white font-semibold"
                : "text-text-secondary hover:bg-gray-100"
            }`}
          >
            {labelFor(t)}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          불러오는 중...
        </div>
      ) : isError ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-error">
          예매 내역을 불러올 수 없습니다.
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-text-secondary">
          예매 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.bookingId}
              booking={b}
              onClick={() => navigate(`/reservations/${b.bookingNumber}`)}
              onCancel={
                b.status === "CONFIRMED" ? () => setCancelTarget(b) : undefined
              }
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center text-text-secondary text-xs py-4">
          더 불러오는 중...
        </div>
      )}

      {/* 환불 확인 모달 */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="예매를 취소하시겠습니까?"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <p className="font-semibold">{cancelTarget.performanceTitle}</p>
              <p className="text-text-secondary">
                {cancelTarget.performanceDate} {cancelTarget.performanceTime}
              </p>
              <p className="text-text-secondary">
                좌석: {cancelTarget.seatLabel}
              </p>
              <p className="text-text-secondary">
                환불 금액: {cancelTarget.price.toLocaleString()}원
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
              취소 후 복구가 불가능합니다. 환불은 영업일 기준 3~5일 내 결제
              수단으로 반환됩니다.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setCancelTarget(null)}
                disabled={cancelMutation.isPending}
              >
                돌아가기
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "취소 중..." : "예매 취소"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function labelFor(tab: Tab): string {
  switch (tab) {
    case "ALL":
      return "전체";
    case "CONFIRMED":
      return "예매 완료";
    case "PENDING":
      return "결제 대기";
    case "CANCELLED":
      return "취소";
    default:
      return tab;
  }
}
