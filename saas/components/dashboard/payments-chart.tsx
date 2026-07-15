"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { LedgerContribution } from "@/lib/data/group";
import { formatEUR } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

// Répartition des paiements d'un groupe : qui a avancé combien.
export function PaymentsChart({ data }: { data: LedgerContribution[] }) {
  const { locale } = useI18n();
  const total = data.reduce((s, c) => s + c.paid, 0);
  if (total <= 0) return null;

  const slices = data.filter((c) => c.paid > 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="paid"
              nameKey="name"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((entry) => (
                <Cell key={entry.userId} fill={entry.color} />
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
          <span className="text-xs text-muted-foreground">{dashboardCopy[locale].charts.paid}</span>
          <span className="text-lg font-bold">{formatEUR(total)}</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2.5">
        {data.map((c) => (
          <li key={c.userId} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.color }}
            />
            <span className="min-w-0 flex-1 text-foreground">{c.name}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatEUR(c.paid)}
            </span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round((c.paid / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
