"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock3, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { usePilotage } from "@/components/dashboard/pilotage-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getTaxVault, type TaxVault } from "@/lib/services/tax";
import { formatDateFr, formatEUR } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

interface BudgetAlertInput {
  categorie: string;
  depense: number;
  budget: number;
  month: string;
}

interface AlertItem {
  key: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

interface AlertStateRow {
  alert_key: string;
  status: "open" | "snoozed" | "resolved";
  snoozed_until: string | null;
}

export function FinancialInbox({
  workspaceId,
  budgets = [],
}: {
  workspaceId: string;
  budgets?: BudgetAlertInput[];
}) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale].inbox;
  const pilotage = usePilotage();
  const [states, setStates] = useState<Record<string, AlertStateRow>>({});
  const [tax, setTax] = useState<TaxVault | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("financial_alert_states")
        .select("alert_key, status, snoozed_until")
        .eq("workspace_id", workspaceId),
      getTaxVault(workspaceId).catch(() => null),
    ]).then(([stateResult, taxResult]) => {
      if (stateResult.error) {
        toast.error(copy.persistenceFailed, {
          description: stateResult.error.message,
        });
      }
      const next: Record<string, AlertStateRow> = {};
      for (const row of (stateResult.data ?? []) as AlertStateRow[]) next[row.alert_key] = row;
      setStates(next);
      setTax(taxResult);
    });
  }, [copy.persistenceFailed, workspaceId]);

  const alerts = useMemo(() => {
    const data = pilotage?.data;
    if (!data) return [];
    const items: AlertItem[] = [];

    if (data.forecast.premier_decouvert) {
      items.push({
        key: `overdraft:${data.forecast.premier_decouvert}`,
        severity: data.forecast.alerte_30j ? "critical" : "warning",
        title: copy.overdraftTitle,
        detail: copy.overdraftDetail(formatDateFr(data.forecast.premier_decouvert), formatEUR(data.forecast.solde_min)),
      });
    }
    for (const receivable of data.receivables.en_retard) {
      items.push({
        key: `receivable:${receivable.id}`,
        severity: "critical",
        title: copy.receivableTitle(receivable.client, formatEUR(receivable.montant_attendu)),
        detail: copy.receivableDetail(receivable.jours_retard),
      });
    }
    for (const charge of data.recurring.charges.filter((item) => item.alerte)) {
      items.push({
        key: `recurring:${charge.merchant}:${charge.alerte}`,
        severity: "warning",
        title: charge.alerte === "hausse" ? copy.increaseTitle(charge.merchant) : copy.duplicateTitle(charge.merchant),
        detail: copy.recurringDetail(formatEUR(charge.montant_mensuel)),
      });
    }
    for (const budget of budgets) {
      const ratio = budget.budget > 0 ? budget.depense / budget.budget : 0;
      if (ratio >= 0.8) {
        items.push({
          key: `budget:${budget.month}:${budget.categorie}`,
          severity: ratio > 1 ? "critical" : "warning",
          title: ratio > 1 ? copy.budgetOver(budget.categorie) : copy.budgetNear(budget.categorie),
          detail: copy.budgetDetail(formatEUR(budget.depense), formatEUR(budget.budget), Math.round(ratio * 100)),
        });
      }
    }
    const nextTax = tax?.echeances[0];
    if (nextTax) {
      const days = Math.ceil((new Date(`${nextTax.date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
      if (days >= 0 && days <= 30) {
        items.push({
          key: `tax:${nextTax.type}:${nextTax.date}`,
          severity: "info",
          title: copy.taxDue(nextTax.libelle, days),
          detail: copy.taxDetail(formatEUR(nextTax.montant_estime)),
        });
      }
    }
    return items.filter((item) => {
      const state = states[item.key];
      if (!state) return true;
      if (state.status === "resolved") return false;
      if (state.status === "snoozed" && state.snoozed_until) {
        return state.snoozed_until <= new Date().toISOString().slice(0, 10);
      }
      return true;
    });
  }, [budgets, copy, pilotage?.data, states, tax]);

  async function setAlertState(alertKey: string, status: "resolved" | "snoozed") {
    setBusy(alertKey);
    const snoozedUntil = status === "snoozed"
      ? new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
      : null;
    const previous = states[alertKey];
    // Retour visuel immédiat : la ligne disparaît sans attendre le réseau.
    setStates((current) => ({
      ...current,
      [alertKey]: { alert_key: alertKey, status, snoozed_until: snoozedUntil },
    }));
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(copy.sessionExpired);
      const { error } = await supabase.from("financial_alert_states").upsert(
        {
          workspace_id: workspaceId,
          alert_key: alertKey,
          status,
          snoozed_until: snoozedUntil,
          updated_by: user.id,
        },
        { onConflict: "workspace_id,alert_key" }
      );
      if (error) throw new Error(error.message);
      toast.success(status === "resolved" ? copy.resolved : copy.postponed);
    } catch (error) {
      setStates((current) => {
        const next = { ...current };
        if (previous) next[alertKey] = previous;
        else delete next[alertKey];
        return next;
      });
      toast.error(copy.decisionFailed, {
        description: error instanceof Error ? error.message : copy.unknownError,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card id="inbox">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          {copy.title}
          {alerts.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{alerts.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pilotage?.loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{copy.analyzing}</div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground"><Check className="mr-2 h-4 w-4 text-emerald-600" />{copy.empty}</div>
        ) : (
          <ul className="divide-y">
            {alerts.map((alert) => (
              <li key={alert.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <AlertTriangle className={alert.severity === "critical" ? "h-5 w-5 text-red-500" : alert.severity === "warning" ? "h-5 w-5 text-amber-500" : "h-5 w-5 text-primary"} />
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{alert.title}</p><p className="text-xs text-muted-foreground">{alert.detail}</p></div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={busy === alert.key} onClick={() => setAlertState(alert.key, "snoozed")}><Clock3 className="h-3.5 w-3.5" />{copy.postpone}</Button>
                  <Button size="sm" variant="outline" disabled={busy === alert.key} onClick={() => setAlertState(alert.key, "resolved")}><Check className="h-3.5 w-3.5" />{copy.resolve}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
