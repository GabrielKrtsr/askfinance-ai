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

const axisAmount = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;

export function ForecastChart({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getForecast(workspaceId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const message = loading
    ? "Calcul de la prévision…"
    : error
      ? "Prévision indisponible. Le serveur d'analyse est-il démarré ?"
      : !data || data.serie.length === 0
        ? "Pas assez d'historique pour une prévision. Importez plusieurs mois de relevés."
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trésorerie prévisionnelle</CardTitle>
        <CardDescription>
          Projection à 90 jours · récurrents, échéances fiscales, tendance
        </CardDescription>
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
                    <p className="font-semibold">Risque de découvert</p>
                    <p>
                      Solde négatif prévu dès le{" "}
                      {formatDateFr(data.premier_decouvert)} · point bas estimé à{" "}
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
                      name === "solde" ? "Solde projeté" : "Scénario pessimiste",
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
