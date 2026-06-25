// 장르별 매출 분포 파이 차트
// 우측 진행률 바: 각 장르 박스로 감싸기 + 영어 라벨
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { GenreRevenue } from "@/types/domain/admin";

interface GenrePieChartProps {
  data: GenreRevenue[];
}

const GENRE_COLORS: Record<string, string> = {
  MUSICAL: "#825AFF",
  CONCERT: "#FF38A5",
  CLASSIC: "#1D7DFF",
  JAZZ: "#FF9900",
  FESTIVAL: "#00BC7C",
  FANMEETING: "#FFA2D6",
  BALLET: "#C6B5FF",
};

const FALLBACK_COLORS = ["#6C5CE7", "#FF9900", "#FB2C36", "#1D7DFF"];

export default function GenrePieChart({ data }: GenrePieChartProps) {
  function colorFor(genre: string, idx: number) {
    return GENRE_COLORS[genre] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  }

  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
        GENRE ANALYTICS
      </span>
      <h3 className="text-base font-bold text-admin-text mb-4">
        장르별 매출 분포
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* 파이 차트 */}
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="genre"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name ?? ""} ${Math.round((percent ?? 0) * 100)}%`
              }
              labelLine={false}
            >
              {data.map((entry, idx) => (
                <Cell key={entry.genre} fill={colorFor(entry.genre, idx)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
              }}
              formatter={(value) => [
                `₩${Number(value).toLocaleString()}`,
                "매출",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 우측 박스들 — 각 장르를 박스로 감쌈 */}
        <div className="space-y-3">
          {data.map((entry, idx) => {
            const color = colorFor(entry.genre, idx);
            return (
              <div
                key={entry.genre}
                className="border-2 rounded-lg p-3"
                style={{ borderColor: color }}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold text-admin-text">
                      {entry.genre}
                    </span>
                  </div>
                  <span className="text-admin-text-secondary">
                    {entry.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-admin-border overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${entry.percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-admin-text-secondary min-w-[70px] text-right">
                    ₩{entry.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
