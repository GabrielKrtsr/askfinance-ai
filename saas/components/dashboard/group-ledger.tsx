"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, HandCoins, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { PaymentsChart } from "@/components/dashboard/payments-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addSettlement,
  addSharedExpense,
  deleteSharedExpense,
  updateSettlementStatus,
} from "@/lib/actions/shared-expenses";
import type {
  GroupLedger as GroupLedgerData,
  LedgerDebt,
  LedgerSettlement,
} from "@/lib/data/group";
import { cn, formatEUR } from "@/lib/utils";

const todayISO = () => new Date().toISOString().slice(0, 10);

const SETTLEMENT_STATUS_LABEL: Record<LedgerSettlement["status"], string> = {
  paid: "Payé",
  confirmed: "Confirmé",
  disputed: "Contesté",
};

const SETTLEMENT_STATUS_CLASS: Record<LedgerSettlement["status"], string> = {
  paid: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disputed: "border-red-200 bg-red-50 text-red-600",
};

export function GroupLedger({
  ledger,
  workspaceId,
}: {
  ledger: GroupLedgerData;
  workspaceId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // Formulaire d'ajout
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [paidBy, setPaidBy] = useState(ledger.currentUserId);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function submitExpense() {
    const amt = Number(amount.replace(",", "."));
    if (!label.trim() || !(amt > 0)) {
      toast.error("Libellé et montant valides requis.");
      return;
    }
    const shares =
      splitType === "custom"
        ? ledger.members.map((m) => ({
            userId: m.userId,
            amount: Number((customShares[m.userId] ?? "").replace(",", ".")) || 0,
          }))
        : undefined;

    await withBusy("add", async () => {
      await addSharedExpense({
        workspaceId,
        label: label.trim(),
        amount: amt,
        date,
        paidBy,
        splitType,
        shares,
      });
      setLabel("");
      setAmount("");
      setDate(todayISO());
      setSplitType("equal");
      setCustomShares({});
      setShowAdd(false);
    });
  }

  function settle(d: LedgerDebt) {
    void withBusy(`settle-${d.fromUserId}-${d.toUserId}`, () =>
      addSettlement({
        workspaceId,
        fromUser: d.fromUserId,
        toUser: d.toUserId,
        amount: d.amount,
      })
    );
  }

  function markSettlement(
    settlementId: string,
    status: "confirmed" | "disputed"
  ) {
    void withBusy(`settlement-${settlementId}-${status}`, () =>
      updateSettlementStatus({ settlementId, status })
    );
  }

  function remove(id: string) {
    if (!window.confirm("Supprimer cette dépense partagée ?")) return;
    void withBusy(`del-${id}`, () => deleteSharedExpense(id));
  }

  const equalHint =
    amount && ledger.members.length
      ? formatEUR((Number(amount.replace(",", ".")) || 0) / ledger.members.length)
      : null;

  return (
    <div className="space-y-6">
      {/* Soldes / qui doit à qui */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Équilibre du groupe</h2>
            <span className="text-xs text-muted-foreground">
              {formatEUR(ledger.total)} partagés
            </span>
          </div>

          {ledger.debts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Tout est équilibré. 🎉
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ledger.debts.map((d) => (
                <li
                  key={`${d.fromUserId}-${d.toUserId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <span className="text-sm">
                    <strong>{d.fromName}</strong> doit{" "}
                    <strong>{d.toName}</strong>{" "}
                    <span className="font-semibold tabular-nums">
                      {formatEUR(d.amount)}
                    </span>
                  </span>
                  {/* Seuls le payeur ou le bénéficiaire peuvent déclarer le
                      règlement (règle appliquée aussi côté serveur). */}
                  {(d.fromUserId === ledger.currentUserId ||
                    d.toUserId === ledger.currentUserId) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => settle(d)}
                    >
                      {busy === `settle-${d.fromUserId}-${d.toUserId}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <HandCoins className="h-4 w-4" />
                      )}
                      Régler
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Net par membre */}
          <div className="mt-4 flex flex-wrap gap-2">
            {ledger.balances.map((b) => (
              <span
                key={b.userId}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  b.net > 0.005
                    ? "border-emerald-200 text-emerald-700"
                    : b.net < -0.005
                    ? "border-red-200 text-red-600"
                    : "text-muted-foreground"
                )}
              >
                {b.name} :{" "}
                {b.net > 0 ? "+" : ""}
                {formatEUR(b.net)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Répartition des paiements */}
      {ledger.total > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Répartition des paiements</h2>
            <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
              Qui a avancé combien dans le groupe.
            </p>
            <PaymentsChart data={ledger.contributions} />
          </CardContent>
        </Card>
      )}

      {/* Ajouter une dépense */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Dépenses</h2>
            <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAdd ? "Annuler" : "Ajouter"}
            </Button>
          </div>

          {showAdd && (
            <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="se-label">Libellé</Label>
                  <Input
                    id="se-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Courses, restau…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="se-amount">Montant (€)</Label>
                  <Input
                    id="se-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="42,50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="se-date">Date</Label>
                  <Input
                    id="se-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payé par</Label>
                  <Select value={paidBy} onValueChange={setPaidBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ledger.members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.userId === ledger.currentUserId ? "Moi" : m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Répartition */}
              <div className="space-y-1.5">
                <Label>Répartition</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={splitType === "equal" ? "default" : "outline"}
                    onClick={() => setSplitType("equal")}
                  >
                    Égale{equalHint ? ` (${equalHint}/pers.)` : ""}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={splitType === "custom" ? "default" : "outline"}
                    onClick={() => setSplitType("custom")}
                  >
                    Personnalisée
                  </Button>
                </div>
              </div>

              {splitType === "custom" && (
                <div className="space-y-2 rounded-md border bg-background p-3">
                  {ledger.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {m.userId === ledger.currentUserId ? "Moi" : m.name}
                      </span>
                      <Input
                        value={customShares[m.userId] ?? ""}
                        onChange={(e) =>
                          setCustomShares((s) => ({
                            ...s,
                            [m.userId]: e.target.value,
                          }))
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9 w-28"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    La somme des parts doit égaler le montant total.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                disabled={busy === "add"}
                onClick={submitExpense}
              >
                {busy === "add" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Enregistrer la dépense
              </Button>
            </div>
          )}

          {/* Liste des dépenses */}
          {ledger.expenses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune dépense partagée pour l'instant.
            </p>
          ) : (
            <ul className="mt-4 divide-y">
              {ledger.expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("fr-FR")} · payé par{" "}
                      {e.paidBy === ledger.currentUserId ? "moi" : e.paidByName}
                      {e.yourShare > 0
                        ? ` · ma part ${formatEUR(e.yourShare)}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatEUR(e.amount)}
                  </span>
                  <button
                    onClick={() => remove(e.id)}
                    disabled={busy !== null}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-red-500"
                    aria-label="Supprimer"
                  >
                    {busy === `del-${e.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Historique des règlements */}
      {ledger.settlements.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Règlements</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Historique de confiance : payé, confirmé ou contesté.
            </p>
            <ul className="mt-3 divide-y">
              {ledger.settlements.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{s.fromName}</span>{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      <span className="font-medium">{s.toName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatEUR(s.amount)} ·{" "}
                      {new Date(s.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        SETTLEMENT_STATUS_CLASS[s.status]
                      )}
                    >
                      {SETTLEMENT_STATUS_LABEL[s.status]}
                    </span>
                    {s.status === "paid" &&
                      (s.fromUserId === ledger.currentUserId ||
                        s.toUserId === ledger.currentUserId) && (
                        <>
                          {/* Confirmer = attester avoir reçu l'argent :
                              réservé au bénéficiaire (règle serveur). */}
                          {s.toUserId === ledger.currentUserId && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy !== null}
                              onClick={() => markSettlement(s.id, "confirmed")}
                            >
                              {busy === `settlement-${s.id}-confirmed` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Confirmer
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-red-500"
                            disabled={busy !== null}
                            onClick={() => markSettlement(s.id, "disputed")}
                          >
                            Contester
                          </Button>
                        </>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
