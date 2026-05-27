// 일별/기간별 매출 추이 라인 차트 (recharts)
// 이미지 3 참고 — 라이트 배경, 보라 라인, hover tooltip

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

export default function RevenueChart({ data }: RevenueChartProps) {
  // 단위: 천원
  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    revenue: Math.round(d.revenue / 1000),
    tickets: d.ticketsSold,
  }));

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="mb-4">
        <span className="text-[10px] font-bold tracking-wider bg-gray-200 px-2 py-0.5 rounded">
          REVENUE ANALYTICS
        </span>
        <h3 className="text-base font-bold mt-2 text-gray-900">기간별 매출 추이</h3>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(d) => d.replace("-", "/")}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(v) => `${v}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name) => {
              if (name === "revenue") return [`₩${value.toLocaleString()}`, "매출 (천원)"];
              return [value, "티켓 판매"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="line"
            formatter={(v) => (v === "revenue" ? "매출 (천원)" : "티켓 판매")}
          />
          <Line
            type="monotone"
            dataKey="revenue"
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
