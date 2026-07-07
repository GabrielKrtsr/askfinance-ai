"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Inbox,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatEUR, formatDateFr } from "@/lib/utils";
import {
  getReceivables,
  createExpectedReceivable,
  deleteExpectedReceivable,
  type Receivable,
  type ReceivablesResult,
} from "@/lib/services/receivables";

export function ReceivablesRadar({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<ReceivablesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function refresh() {
    try {
      setData(await getReceivables(workspaceId));
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const value = Number(amount.replace(",", "."));
    if (!client.trim() || !Number.isFinite(value) || value <= 0 || !dueDate) {
      toast.error("Renseignez un client, un montant et une date prévue.");
      return;
    }
    setSaving(true);
    const ok = await createExpectedReceivable(workspaceId, client.trim(), value, dueDate);
    setSaving(false);
    if (!ok) {
      toast.error("Impossible d'enregistrer l'encaissement attendu.");
      return;
    }
    toast.success("Encaissement attendu ajouté");
    setClient("");
    setAmount("");
    setDueDate("");
    setAdding(false);
    await refresh();
  }

  async function handleDelete(id: string) {
    const ok = await deleteExpectedReceivable(id);
    if (!ok) {
      toast.error("Suppression impossible.");
      return;
    }
    await refresh();
  }

  async function copyRelance(r: Receivable) {
    if (!r.relance) return;
    try {
      await navigator.clipboard.writeText(r.relance);
      setCopied(r.id);
      toast.success("Relance copiée", {
        description: "Le brouillon est dans votre presse-papiers.",
      });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Copie impossible sur ce navigateur.");
    }
  }

  const late = data?.receivables.filter((r) => r.statut === "late") ?? [];
  const upcoming = data?.receivables.filter((r) => r.statut === "upcoming") ?? [];
  const received = data?.receivables.filter((r) => r.statut === "received") ?? [];
  const isEmpty = !data || data.receivables.length === 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            Radar des encaissements
            {late.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                {late.length} en retard
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Déclarez les virements attendus — l'app détecte ceux qui n'arrivent pas
          </CardDescription>
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Formulaire d'ajout */}
        {adding && (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Client
              </label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex. ACME SARL"
              />
            </div>
            <div className="space-y-1 sm:w-28">
              <label className="text-xs font-medium text-muted-foreground">
                Montant (€)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="3000"
              />
            </div>
            <div className="space-y-1 sm:w-40">
              <label className="text-xs font-medium text-muted-foreground">
                Date prévue
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chargement…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Radar indisponible. Le serveur d'analyse est-il démarré ?
          </p>
        ) : isEmpty && !adding ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Inbox className="h-6 w-6" />
            <p>
              Aucun encaissement attendu. Cliquez sur « Ajouter » pour déclarer un
              virement que vous attendez d'un client.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* En retard */}
            {late.length > 0 && (
              <div className="space-y-2">
                {late.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.client}</p>
                      <p className="text-xs text-red-700">
                        Attendu le{" "}
                        {r.date_prevue ? formatDateFr(r.date_prevue) : "—"} ·{" "}
                        {r.jours_retard} j de retard
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-red-700">
                      {formatEUR(r.montant_attendu)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-100"
                      onClick={() => copyRelance(r)}
                    >
                      {copied === r.id ? (
                        <>
                          <Check className="h-4 w-4" /> Copié
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Relance
                        </>
                      )}
                    </Button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="shrink-0 text-red-400 hover:text-red-600"
                      aria-label="Supprimer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* À venir */}
            {upcoming.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  À venir
                </p>
                <ul className="divide-y">
                  {upcoming.map((r) => (
                    <li key={r.id} className="group flex items-center gap-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.client}</p>
                        <p className="text-xs text-muted-foreground">
                          Prévu le{" "}
                          {r.date_prevue ? formatDateFr(r.date_prevue) : "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatEUR(r.montant_attendu)}
                      </span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reçus */}
            {received.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Reçus
                </p>
                <ul className="divide-y">
                  {received.map((r) => (
                    <li key={r.id} className="group flex items-center gap-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.client}</p>
                        <p className="text-xs text-muted-foreground">
                          Reçu le {r.date_recu ? formatDateFr(r.date_recu) : "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-emerald-600">
                        {formatEUR(r.montant_attendu)}
                      </span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isEmpty && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Reste à encaisser</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    late.length > 0 && "text-red-600"
                  )}
                >
                  {formatEUR(data.total_attendu)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
