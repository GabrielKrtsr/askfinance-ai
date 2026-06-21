"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatEUR } from "@/lib/utils";

interface CashflowChartProps {
  data: { mois: string; revenus: number; depenses: number }[];
}

export function CashflowChart({ data }: CashflowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 8, left: -8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="revenus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(243 75% 59%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(243 75% 59%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="depenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(173 80% 40%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(173 80% 40%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="hsl(214 32% 91%)"
        />
        <XAxis
          dataKey="mois"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }}
          tickFormatter={(v) => `${v / 1000}k`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(214 32% 91%)",
            fontSize: 13,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
          formatter={(value, name) => [
            formatEUR(Number(value)),
            name === "revenus" ? "Revenus" : "Dépenses",
          ]}
        />
        <Area
          type="monotone"
          dataKey="revenus"
          stroke="hsl(243 75% 59%)"
          strokeWidth={2}
          fill="url(#revenus)"
        />
        <Area
          type="monotone"
          dataKey="depenses"
          stroke="hsl(173 80% 40%)"
          strokeWidth={2}
          fill="url(#depenses)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
