"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Repeat, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEUR } from "@/lib/utils";
import {
  getRecurringCharges,
  type RecurringResult,
} from "@/lib/services/recurring";

const TYPE_LABEL: Record<string, string> = {
  abonnement: "Abonnement",
  fixe: "Charge fixe",
  variable: "Charge variable",
};

export function RecurringCharges() {
  const [data, setData] = useState<RecurringResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getRecurringCharges()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charges récurrentes</CardTitle>
        <CardDescription>
          Abonnements et paiements réguliers détectés automatiquement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Analyse en cours…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Détection indisponible. Le serveur d'analyse est-il démarré ?
          </p>
        ) : !data || data.charges.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune charge récurrente détectée. Importez plusieurs mois de
            relevés pour activer la détection.
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {data.charges.map((c) => (
                <li key={c.merchant} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Repeat className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {c.merchant}
                      </p>
                      {c.alerte === "hausse" && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-red-500">
                          <TrendingUp className="h-3 w-3" /> hausse
                        </span>
                      )}
                      {c.alerte === "doublon" && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-500">
                          <AlertTriangle className="h-3 w-3" /> doublon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[c.type] ?? c.type} · {c.frequence}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatEUR(c.montant_mensuel)}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      /mois
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                Total mensuel récurrent
              </span>
              <span className="font-bold tabular-nums">
                {formatEUR(data.total_mensuel)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
