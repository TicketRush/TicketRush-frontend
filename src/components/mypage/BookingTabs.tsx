// src/components/mypage/BookingTabs.tsx
import { Calendar, History } from "lucide-react";
import type { BookingTab } from "@/types/domain/booking";

interface BookingTabsProps {
  activeTab: BookingTab;
  onChange: (tab: BookingTab) => void;
}

/**
 * 예정된 공연 / 지난 공연 탭
 *
 * ─ 운영 정책 — [탭 분기 정책] ─
 *  - 예정된 공연 탭 조건: 공연 날짜 >= 현재 날짜
 *  - 지난 공연 탭 조건: 공연 날짜 < 현재 날짜
 *  - 탭 전환 시 API 재요청 없음 (프론트 필터링)
 *
 * ─ 디자인 ─
 *  - 활성: 보라 배경 + 흰 텍스트
 *  - 비활성: 흰 배경 + 회색 텍스트
 *  - 풀폭 절반씩 가로 배치
 */
export function BookingTabs({ activeTab, onChange }: BookingTabsProps) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-3 mb-6">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "upcoming"}
        onClick={() => onChange("upcoming")}
        className={`
          flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors
          ${
            activeTab === "upcoming"
              ? "bg-primary text-white"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }
        `}
      >
        <Calendar className="w-4 h-4" />
        예정된 공연
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "past"}
        onClick={() => onChange("past")}
        className={`
          flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors
          ${
            activeTab === "past"
              ? "bg-primary text-white"
              : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
          }
        `}
      >
        <History className="w-4 h-4" />
        지난 공연
      </button>
    </div>
  );
}
