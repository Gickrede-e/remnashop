"use client";

import { memo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatChartDate(value: string) {
  return value.slice(5).replace("-", ".");
}

function formatCompactRevenue(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }

  return String(value);
}

export const RevenueChart = memo(function RevenueChart({
  data
}: {
  data: Array<{ date: string; revenue: number }>;
}) {
  return (
    <div className="controlChartCanvas">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 8,
            right: 4,
            bottom: 8,
            left: -8
          }}
        >
          <defs>
            <linearGradient id="controlCenterRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#2be4ff" stopOpacity={0.82} />
              <stop offset="95%" stopColor="#2be4ff" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(155,176,195,0.12)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#93a7bb", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            height={26}
            interval="preserveStartEnd"
            minTickGap={24}
            tickMargin={8}
            tickFormatter={formatChartDate}
          />
          <YAxis
            tick={{ fill: "#93a7bb", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickMargin={8}
            tickFormatter={formatCompactRevenue}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(7, 18, 28, 0.96)",
              border: "1px solid rgba(111, 220, 255, 0.18)",
              borderRadius: 16
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2be4ff"
            fill="url(#controlCenterRevenue)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
