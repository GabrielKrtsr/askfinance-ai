"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { spendingByCategory, formatEUR } from "@/lib/mock-data";

const total = spendingByCategory.reduce((s, c) => s + c.montant, 0);

export function CategoryChart() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={spendingByCategory}
              dataKey="montant"
              nameKey="categorie"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {spendingByCategory.map((entry) => (
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
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-bold">{formatEUR(total)}</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2.5">
        {spendingByCategory.map((c) => (
          <li key={c.categorie} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.couleur }}
            />
            <span className="flex-1 text-foreground">{c.categorie}</span>
            <span className="font-medium">{formatEUR(c.montant)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground">
              {Math.round((c.montant / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
