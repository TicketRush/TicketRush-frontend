import { useState } from "react";
import useAuthStore from "@/stores/global/authStore";
import { useMyBookings } from "@/hooks/queries/useMyBookings";
import { ProfileCard } from "@/components/mypage/ProfileCard";
import { BookingTabs } from "@/components/mypage/BookingTabs";
import { BookingCard } from "@/components/mypage/BookingCard";
import { filterBookingsByTab } from "@/utils/booking";
import type { BookingTab } from "@/types/domain/booking";

export default function MyBookingsPage() {
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useMyBookings();

  const allBookings = data?.items ?? [];
  // 탭 전환 시 API 재요청 없이 프론트에서 필터 (정책: 공연 시작시각 기준)
  const bookings = filterBookingsByTab(allBookings, tab);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* 사용자 정보 카드 — 총 예매 수는 전체 목록 길이 */}
      {user && (
        <ProfileCard
          name={user.name}
          email={user.email}
          joinedAt={user.joinedAt}
          totalBookings={allBookings.length}
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
    </div>
  );
}
