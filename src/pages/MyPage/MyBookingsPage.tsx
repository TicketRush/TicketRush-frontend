import { useEffect, useState } from "react";
import useAuthStore from "@/stores/global/authStore";
import { useMyBookings } from "@/hooks/queries/useMyBookings";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import { ProfileCard } from "@/components/mypage/ProfileCard";
import { BookingTabs } from "@/components/mypage/BookingTabs";
import { BookingCard } from "@/components/mypage/BookingCard";
import { filterBookingsByTab } from "@/utils/booking";
import { shouldPrefetchMyBookingsTab } from "@/utils/booking/myBookingsPages";
import type { BookingTab } from "@/types/domain/booking";

export default function MyBookingsPage() {
  useDocumentTitle("내 예매");

  const [tab, setTab] = useState<BookingTab>("upcoming");
  const user = useAuthStore((s) => s.user);

  const {
    items: allBookings,
    totalCount,
    isCountError,
    isLoading,
    isError,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useMyBookings();

  // 탭 전환 시 API 재요청 없이 프론트에서 필터
  // 목록 API에 공연 시간이 없어 공연 날짜(performanceDate) 기준 (#168)
  const bookings = filterBookingsByTab(allBookings, tab);
  const totalBookings = isCountError ? allBookings.length : totalCount;

  useEffect(() => {
    if (
      !shouldPrefetchMyBookingsTab({
        tabItemCount: bookings.length,
        hasMore,
        isFetchingNextPage,
        isFetchNextPageError,
      })
    ) {
      return;
    }
    void fetchNextPage();
  }, [
    bookings.length,
    hasMore,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  ]);

  const showPrefetching =
    !isLoading &&
    !isError &&
    bookings.length === 0 &&
    (isFetchingNextPage || hasMore);
  const showLoadMore =
    bookings.length > 0 && hasMore && !isFetchNextPageError;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 총 예매 수는 /booking/me/count 합(확정·환불). 실패 시 목록 길이 (#339) */}
      {user && (
        <ProfileCard
          name={user.name}
          email={user.email}
          joinedAt={user.joinedAt}
          totalBookings={totalBookings}
        />
      )}

      <BookingTabs activeTab={tab} onChange={setTab} />

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          불러오는 중...
        </div>
      ) : isError ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-[#FB2C36]">
          예매 내역을 불러올 수 없습니다.
        </div>
      ) : showPrefetching ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          예매 내역을 더 불러오는 중...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          {tab === "upcoming"
            ? "예정된 예매 내역이 없습니다."
            : "지난 예매 내역이 없습니다."}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard key={b.bookingId} booking={b} tab={tab} />
          ))}
        </div>
      )}

      {isFetchingNextPage && bookings.length > 0 ? (
        <p className="mt-4 text-center text-sm text-gray-500">더 불러오는 중...</p>
      ) : null}

      {isFetchNextPageError && !isFetchingNextPage ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {showLoadMore && !isFetchingNextPage ? (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          className="mt-4 w-full py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          더보기
        </button>
      ) : null}
    </div>
  );
}
