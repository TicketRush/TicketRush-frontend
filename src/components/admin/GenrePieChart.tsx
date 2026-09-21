// 장르별 매출 분포 파이 차트
// 범례는 subgrid로 %·금액을 같은 열에 두고, 자릿수는 오른쪽(끝)에 맞춘다.
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { GenreRevenue } from "@/types/domain/admin";
import { formatAdminWon } from "@/utils/admin/formatAdminMetric";

interface GenrePieChartProps {
  data: GenreRevenue[] | undefined;
  isLoading?: boolean;
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

export default function GenrePieChart({ data, isLoading }: GenrePieChartProps) {
  function colorFor(genre: string, idx: number) {
    return GENRE_COLORS[genre] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  }

  const pieSlices = data?.filter((row) => row.revenue > 0) ?? [];

  return (
    <div className="bg-admin-card-bg border-2 border-admin-card-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded inline-block mb-2">
        GENRE ANALYTICS
      </span>
      <h3 className="text-base font-bold text-gray-900 mb-4">
        장르별 매출 분포
      </h3>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-gray-500">
          장르별 매출을 불러오는 중...
        </div>
      ) : data == null ? (
        <div className="py-16 text-center text-sm text-gray-500">
          장르별 매출을 집계할 수 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieSlices}
                dataKey="revenue"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => {
                  const name = entry.name ?? "";
                  const percent = entry.percent ?? 0;
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                labelLine={false}
              >
                {pieSlices.map((entry, idx) => (
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
                formatter={(value) => {
                  const num = Number(value);
                  return [`₩${num.toLocaleString()}`, "매출"];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="grid w-full max-w-md grid-cols-[minmax(0,1fr)_auto] gap-3 lg:justify-self-end">
            {data.map((entry, idx) => {
              const color = colorFor(entry.genre, idx);
              return (
                <div
                  key={entry.genre}
                  className="col-span-2 grid grid-cols-subgrid items-center gap-x-3 gap-y-2 border-2 border-admin-card-border rounded-lg p-3"
                >
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold text-gray-900 truncate">
                      {entry.label}
                    </span>
                  </div>
                  <span className="justify-self-end text-xs tabular-nums text-gray-500">
                    {entry.percentage.toFixed(0)}%
                  </span>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${entry.percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="justify-self-end text-xs tabular-nums text-gray-500">
                    {formatAdminWon(entry.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
