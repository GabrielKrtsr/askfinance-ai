"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateFr, formatEUR } from "@/lib/utils";
import { getForecast, type ForecastResult } from "@/lib/services/forecast";
import { usePilotage } from "@/components/dashboard/pilotage-provider";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

const axisAmount = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;

export function ForecastChart({ workspaceId }: { workspaceId: string }) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale].forecast;
  // Dans un PilotageProvider : données partagées (un seul appel API pour la
  // page). Sinon : fetch autonome, comme avant.
  const shared = usePilotage();
  const isShared = shared !== null;
  const [ownData, setOwnData] = useState<ForecastResult | null>(null);
  const [ownLoading, setOwnLoading] = useState(true);
  const [ownError, setOwnError] = useState(false);

  useEffect(() => {
    if (isShared) return;
    getForecast(workspaceId)
      .then(setOwnData)
      .catch(() => setOwnError(true))
      .finally(() => setOwnLoading(false));
  }, [isShared, workspaceId]);

  const data = shared ? (shared.data?.forecast ?? null) : ownData;
  const loading = shared ? shared.loading : ownLoading;
  const error = shared ? shared.error : ownError;

  const message = loading
    ? copy.calculating
    : error
      ? copy.unavailable
      : !data || data.serie.length === 0
        ? copy.insufficient
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {message ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {message}
          </p>
        ) : (
          data && (
            <>
              {data.alerte_30j && data.premier_decouvert && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">{copy.overdraft}</p>
                    <p>
                      {copy.negativeFrom}{" "}
                      {formatDateFr(data.premier_decouvert)} {copy.lowPoint}{" "}
                      {formatEUR(data.solde_min)}.
                    </p>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={data.serie}
                  margin={{ top: 10, right: 8, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="forecast" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(243 75% 59%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(243 75% 59%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(214 32% 91%)"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                    tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }}
                    tickFormatter={(d) => formatDateFr(String(d)).slice(0, 5)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }}
                    tickFormatter={axisAmount}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(214 32% 91%)",
                      fontSize: 13,
                    }}
                    labelFormatter={(d) => formatDateFr(String(d))}
                    formatter={(value, name) => [
                      formatEUR(Number(value)),
                      name === "solde" ? copy.projectedBalance : copy.pessimistic,
                    ]}
                  />
                  {/* Ligne 0 = seuil de découvert (zone de danger en dessous) */}
                  <ReferenceLine
                    y={0}
                    stroke="hsl(0 84% 60%)"
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="solde"
                    stroke="hsl(243 75% 59%)"
                    strokeWidth={2}
                    fill="url(#forecast)"
                  />
                  <Line
                    type="monotone"
                    dataKey="borne_basse"
                    stroke="hsl(0 72% 51%)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
