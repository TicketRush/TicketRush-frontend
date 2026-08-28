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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { fullDate: string; revenue: number; tickets: number };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
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
    <div className="bg-admin-card-bg border-2 border-admin-card-border rounded-xl p-6">
      <span className="text-[10px] font-bold tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded inline-block mb-2">
        REVENUE ANALYTICS
      </span>
      <h3 className="text-base font-bold text-gray-900 mb-4">
        기간별 매출 추이
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(v) => `${v}K`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6C5CE7" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            align="left"
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
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
