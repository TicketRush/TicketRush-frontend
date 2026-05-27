
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DailyRevenue } from "@/types/domain/admin";

interface RevenueChartProps {
  data: DailyRevenue[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-md text-xs">
      <p className="font-bold mb-1 text-gray-900">{data.fullDate}</p>
      <p className="text-gray-700">
        매출 (천원):{" "}
        <span className="font-bold">{data.revenue.toLocaleString()}</span>
      </p>
      <p className="text-primary">
        티켓 판매: <span className="font-bold">{data.tickets}</span>
      </p>
    </div>
  );
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5).replace("-", "/"),
    fullDate: d.date,
    revenue: Math.round(d.revenue / 1000),
    tickets: d.ticketsSold,
  }));

  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-admin-border px-2 py-0.5 rounded inline-block mb-2">
        REVENUE ANALYTICS
      </span>
      <h3 className="text-base font-bold text-admin-text mb-4">
        기간별 매출 추이
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#252B3D" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
          {/* 좌측 Y축 — 매출 */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            tickFormatter={(v) => `${v}K`}
            label={{
              value: "매출 (천원)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#9CA3AF" },
            }}
          />
          {/* 우측 Y축 — 티켓 판매 */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6C5CE7" }}
            label={{
              value: "티켓 판매",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 11, fill: "#6C5CE7" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }}
            iconType="line"
            formatter={(v) => (v === "revenue" ? "매출 (천원)" : "티켓 판매")}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#9CA3AF"
            strokeWidth={2}
            dot={{ r: 4, fill: "#9CA3AF" }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tickets"
            stroke="#6C5CE7"
            strokeWidth={2}
            dot={{ r: 4, fill: "#6C5CE7" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}