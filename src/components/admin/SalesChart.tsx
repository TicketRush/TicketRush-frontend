// 공연별 판매 현황 진행률 (이미지 2)
// 각 공연마다 가로 진행률 바 + 판매수/총수 + 매출 + 매진 뱃지
import ProgressBar from "./ProgressBar";
import type { ConcertSalesStatus } from "@/types/domain/admin";

interface SalesChartProps {
  data: ConcertSalesStatus[];
}

const GENRE_LABELS: Record<string, string> = {
  CONCERT: "Concert",
  MUSICAL: "Musical",
  CLASSIC: "Classical",
  JAZZ: "Jazz",
  FESTIVAL: "Festival",
  FANMEETING: "Fan Meeting",
  BALLET: "Ballet",
};

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="bg-admin-card-bg border-2 border-admin-card-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded inline-block mb-2">
        SALES CHART
      </span>
      <h3 className="text-base font-bold text-gray-900 mb-4">
        공연별 판매 현황
      </h3>

      <div className="space-y-3">
        {data.map((c) => (
          <div
            key={c.concertId}
            className="border-2 border-admin-card-border rounded-lg p-4 flex items-center gap-4"
          >
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-bold">{c.title}</span>
                <span className="text-gray-500 text-xs ml-2">
                  {GENRE_LABELS[c.genre] ?? c.genre}
                </span>
              </p>
              <div className="mt-2">
                <ProgressBar
                  current={c.soldSeats}
                  total={c.totalSeats}
                  variant={c.isSoldOut ? "sold-out" : "default"}
                />
              </div>
            </div>

            <div className="text-right min-w-[100px]">
              <p className="text-sm font-bold text-gray-900">
                {c.soldSeats}/{c.totalSeats}
              </p>
              <p className="text-xs text-gray-500">
                {(c.occupancyRate * 100).toFixed(0)}%
              </p>
            </div>

            <div className="text-right min-w-[110px]">
              <p className="text-sm font-bold text-gray-900">
                ₩{c.revenue.toLocaleString()}
              </p>
              {c.isSoldOut && (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 mt-1">
                  매진
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
