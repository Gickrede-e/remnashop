"use client";

import { memo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatChartDate(value: string) {
  return value.slice(5).replace("-", ".");
}

export const RevenueChart = memo(function RevenueChart({
  data
}: {
  data: Array<{ date: string; revenue: number }>;
}) {
  return (
    <div className="h-[260px] w-full overflow-hidden md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            bottom: 4,
            left: 0
          }}
        >
          <defs>
            <linearGradient id="gickvpnRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickMargin={8}
            tickFormatter={formatChartDate}
          />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickMargin={8}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,10,10,0.96)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="url(#gickvpnRevenue)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
