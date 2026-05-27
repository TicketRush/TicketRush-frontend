// 장르별 매출 분포 파이 차트 (recharts)
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { GenreRevenue } from "@/types/domain/admin";

interface GenrePieChartProps {
  data: GenreRevenue[];
}

// 사용자 메모리의 장르별 색상 토큰 활용
const GENRE_COLORS: Record<string, string> = {
  MUSICAL: "#825AFF",
  CONCERT: "#FF38A5",
  CLASSIC: "#1D7DFF",
  JAZZ: "#FF9900",
  FESTIVAL: "#00BC7C",
  FANMEETING: "#FFA2D6",
  BALLET: "#C6B5FF",
};

export default function GenrePieChart({ data }: GenrePieChartProps) {
  return (
    <div className="bg-white rounded-xl p-6">
      <div className="mb-4">
        <span className="text-[10px] font-bold tracking-wider bg-gray-200 px-2 py-0.5 rounded">
          GENRE ANALYTICS
        </span>
        <h3 className="text-base font-bold mt-2 text-gray-900">장르별 매출 분포</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ label, percentage }) =>
                `${label} ${percentage.toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.genre}
                  fill={GENRE_COLORS[entry.genre] ?? "#6C5CE7"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number) => [`₩${value.toLocaleString()}`, "매출"]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 범례 + 진행률 바 */}
        <div className="space-y-3">
          {data.map((entry) => (
            <div key={entry.genre} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: GENRE_COLORS[entry.genre] ?? "#6C5CE7",
                    }}
                  />
                  <span className="font-semibold">{entry.label}</span>
                </div>
                <span className="text-gray-500">
                  {entry.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${entry.percentage}%`,
                      backgroundColor:
                        GENRE_COLORS[entry.genre] ?? "#6C5CE7",
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 min-w-[70px] text-right">
                  ₩{entry.revenue.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
