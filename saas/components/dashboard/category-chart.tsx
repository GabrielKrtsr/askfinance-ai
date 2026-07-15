"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatEUR } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

interface CategoryChartProps {
  data: { categorie: string; montant: number; couleur: string }[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const { locale } = useI18n();
  const total = data.reduce((s, c) => s + c.montant, 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="montant"
              nameKey="categorie"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.categorie} fill={entry.couleur} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(214 32% 91%)",
                fontSize: 13,
              }}
              formatter={(value) => formatEUR(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">{dashboardCopy[locale].charts.total}</span>
          <span className="text-lg font-bold">{formatEUR(total)}</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2.5">
        {data.map((c) => (
          <li key={c.categorie} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.couleur }}
            />
            <span className="min-w-0 flex-1 text-foreground">{c.categorie}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatEUR(c.montant)}
            </span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round((c.montant / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
