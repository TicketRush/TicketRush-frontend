// src/components/mypage/ProfileCard.tsx
import { User as UserIcon } from "lucide-react";

interface ProfileCardProps {
  name: string;
  email: string;
  joinedAt: string; // ISO 8601
  totalBookings: number;
}

/**
 * 회원 정보 요약 카드
 *
 * ─ 운영 정책 — [사용자 정보 카드] ─
 *  표시 정보: 사용자 이름, 가입일, 이메일, 전화번호, 총 예매 수
 *  (※ 현재 단계에서는 전화번호는 authStore에 없으므로 생략 — Sprint 9에서 user API 확장 후 추가)
 */
export function ProfileCard({
  name,
  email,
  joinedAt,
  totalBookings,
}: ProfileCardProps) {
  const formattedJoinDate = joinedAt.split("T")[0]; // YYYY-MM-DD

  return (
    <div
      className="flex items-center justify-between
                    bg-white border border-gray-200 rounded-lg
                    px-8 py-6 mb-6"
    >
      {/* 좌측: 아이콘 + 정보 */}
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <UserIcon className="w-7 h-7 text-primary" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{name}님</h2>
          <p className="text-sm text-gray-500">
            회원 가입일: {formattedJoinDate}
          </p>
          <p className="text-sm text-gray-500">이메일: {email}</p>
        </div>
      </div>

      {/* 우측: 총 예매 수 카드 */}
      <div className="border-2 border-primary/30 rounded-lg px-6 py-3 text-center min-w-[88px]">
        <p className="text-xs text-gray-500 mb-1">총 예매 수</p>
        <p className="text-2xl font-bold text-primary">{totalBookings}</p>
      </div>
    </div>
  );
}
