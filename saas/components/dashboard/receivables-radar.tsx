"use client";

import { useEffect, useState } from "react";
import { Clock, Copy, Check, Inbox, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatEUR, formatDateFr } from "@/lib/utils";
import {
  getReceivables,
  type Receivable,
  type ReceivablesResult,
} from "@/lib/services/receivables";

const FREQ_LABEL: Record<string, string> = {
  mensuel: "mensuel",
  bimensuel: "tous les 15 j",
  hebdomadaire: "hebdomadaire",
  annuel: "annuel",
};

export function ReceivablesRadar() {
  const [data, setData] = useState<ReceivablesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getReceivables()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function copyRelance(r: Receivable) {
    if (!r.relance) return;
    try {
      await navigator.clipboard.writeText(r.relance);
      setCopied(r.key);
      toast.success("Relance copiée", {
        description: "Le brouillon est dans votre presse-papiers.",
      });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Copie impossible sur ce navigateur.");
    }
  }

  const enRetard = data?.en_retard ?? [];
  const aJour = (data?.recettes ?? []).filter((r) => r.statut === "a_jour");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Radar des encaissements
          {enRetard.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              {enRetard.length} en retard
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Vos rentrées clients régulières — et celles qui n'arrivent pas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Analyse des encaissements…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Radar indisponible. Le serveur d'analyse est-il démarré ?
          </p>
        ) : !data || data.recettes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Inbox className="h-6 w-6" />
            <p>
              Aucune rentrée régulière détectée. Importez plusieurs mois de
              relevés pour repérer vos paiements clients récurrents.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Encaissements en retard (priorité haute) */}
            {enRetard.length > 0 && (
              <div className="space-y-2">
                {enRetard.map((r) => (
                  <div
                    key={r.key}
                    className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.client}
                      </p>
                      <p className="text-xs text-red-700">
                        Attendu depuis le {formatDateFr(r.prochaine_attendue)} ·{" "}
                        {r.jours_retard} j de retard
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-red-700">
                      ~{formatEUR(r.montant_attendu)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-100"
                      onClick={() => copyRelance(r)}
                    >
                      {copied === r.key ? (
                        <>
                          <Check className="h-4 w-4" /> Copié
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Relance
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Recettes à jour */}
            {aJour.length > 0 && (
              <div>
                {enRetard.length > 0 && (
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    À jour
                  </p>
                )}
                <ul className="divide-y">
                  {aJour.map((r) => (
                    <li
                      key={r.key}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {r.client}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {FREQ_LABEL[r.frequence] ?? r.frequence} · prochain vers.
                          attendu {formatDateFr(r.prochaine_attendue)}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                        ~{formatEUR(r.montant_attendu)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                Total mensuel attendu
              </span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  enRetard.length > 0 && "text-red-600"
                )}
              >
                {formatEUR(data.total_attendu_mensuel)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
