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
  type Receivable,
  type ReceivablesResult,
} from "@/lib/services/receivables";
import { confirmReceivablePayment, createReceivable, recordPartialReceivablePayment, recordReceivableReminder, removeReceivable } from "@/lib/actions/receivables";
import { usePilotage } from "@/components/dashboard/pilotage-provider";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

export function ReceivablesRadar({ workspaceId }: { workspaceId: string }) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  // Dans un PilotageProvider : données partagées (un seul appel API pour la
  // page). Sinon : fetch autonome, comme avant.
  const shared = usePilotage();
  const isShared = shared !== null;
  const [ownData, setOwnData] = useState<ReceivablesResult | null>(null);
  const [ownLoading, setOwnLoading] = useState(true);
  const [ownError, setOwnError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const data = shared ? (shared.data?.receivables ?? null) : ownData;
  const loading = shared ? shared.loading : ownLoading;
  const error = shared ? shared.error : ownError;

  async function refresh() {
    if (shared) {
      await shared.refresh();
      return;
    }
    try {
      setOwnData(await getReceivables(workspaceId));
      setOwnError(false);
    } catch {
      setOwnError(true);
    }
  }

  useEffect(() => {
    if (isShared) return;
    getReceivables(workspaceId)
      .then(setOwnData)
      .catch(() => setOwnError(true))
      .finally(() => setOwnLoading(false));
  }, [isShared, workspaceId]);

  async function handleSave() {
    const value = Number(amount.replace(",", "."));
    if (!client.trim() || !Number.isFinite(value) || value <= 0 || !dueDate) {
      toast.error(copy.receivables.required);
      return;
    }
    setSaving(true);
    const ok = await createReceivable({ client: client.trim(), amount: value, dueDate, invoiceNumber, contactEmail });
    setSaving(false);
    if (!ok) {
      toast.error(copy.receivables.saveFailed);
      return;
    }
    toast.success(copy.receivables.added);
    setClient("");
    setAmount("");
    setDueDate("");
    setInvoiceNumber("");
    setContactEmail("");
    setAdding(false);
    await refresh();
  }

  async function handleDelete(id: string) {
    const ok = await removeReceivable(id);
    if (!ok) {
      toast.error(copy.receivables.deleteFailed);
      return;
    }
    await refresh();
  }

  async function copyRelance(r: Receivable) {
    if (!r.relance) return;
    try {
      await navigator.clipboard.writeText(r.relance);
      await recordReceivableReminder({ receivableId: r.id, content: r.relance, sent: false });
      setCopied(r.id);
      toast.success(copy.receivables.copied, {
        description: copy.receivables.clipboard,
      });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(copy.receivables.copyUnavailable);
    }
  }

  async function markReminderSent(r: Receivable) {
    if (!r.relance) return;
    try {
      await recordReceivableReminder({ receivableId: r.id, content: r.relance, sent: true });
      toast.success(copy.receivables.reminderSent);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.receivables.saveGenericFailed);
    }
  }

  async function confirmPayment(id: string) {
    try {
      await confirmReceivablePayment(id);
      toast.success(copy.receivables.paymentConfirmed);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.receivables.confirmationFailed);
    }
  }

  async function partialPayment(r: Receivable) {
    const raw = window.prompt(copy.receivables.amountPrompt);
    if (!raw) return;
    const value = Number(raw.replace(",", "."));
    try {
      await recordPartialReceivablePayment(r.id, value);
      toast.success(copy.receivables.partialSaved);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.receivables.saveGenericFailed);
    }
  }

  const late = data?.receivables.filter((r) => r.statut === "late" || r.statut === "partial") ?? [];
  const upcoming = data?.receivables.filter((r) => r.statut === "upcoming") ?? [];
  const received = data?.receivables.filter((r) => r.statut === "received") ?? [];
  const isEmpty = !data || data.receivables.length === 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            {copy.receivables.title}
            {late.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                {late.length} {copy.receivables.overdue}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {copy.receivables.description}
          </CardDescription>
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            {copy.common.add}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Formulaire d'ajout */}
        {adding && (
          <div className="mb-4 grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {copy.receivables.client}
              </label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={copy.receivables.clientPlaceholder}
              />
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{copy.receivables.invoice}</label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={copy.receivables.invoicePlaceholder} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{copy.receivables.clientEmail}</label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={copy.receivables.emailPlaceholder} /></div>
            <div className="space-y-1 sm:w-28">
              <label className="text-xs font-medium text-muted-foreground">
                {copy.receivables.amount}
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
                {copy.receivables.dueDate}
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
                  copy.common.save
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                {copy.common.cancel}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.common.loading}
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.receivables.unavailable}
          </p>
        ) : isEmpty && !adding ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Inbox className="h-6 w-6" />
            <p>
              {copy.receivables.empty}
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
                      {r.invoice_number && <p className="text-xs text-muted-foreground">{copy.receivables.invoiceShort} {r.invoice_number}</p>}
                      <p className="text-xs text-red-700">
                        {copy.receivables.expectedOn}{" "}
                        {r.date_prevue ? formatDateFr(r.date_prevue) : copy.receivables.notProvided} ·{" "}
                        {r.statut === "partial" ? copy.receivables.partialStatus(formatEUR(r.paid_amount)) : copy.receivables.daysLate(r.jours_retard)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-red-700">
                      {formatEUR(r.montant_attendu - r.paid_amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-100"
                      onClick={() => copyRelance(r)}
                    >
                      {copied === r.id ? (
                        <>
                          <Check className="h-4 w-4" /> {copy.receivables.copiedButton}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> {copy.receivables.reminder}
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={() => markReminderSent(r)}>{copy.receivables.markSent}</Button>
                    <Button size="sm" variant="outline" className="shrink-0 bg-white" onClick={() => confirmPayment(r.id)}><CheckCircle2 className="h-4 w-4" />{copy.receivables.paymentReceived}</Button>
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={() => partialPayment(r)}>{copy.receivables.partial}</Button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="shrink-0 text-red-400 hover:text-red-600"
                      aria-label={copy.common.delete}
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
                  {copy.receivables.upcoming}
                </p>
                <ul className="divide-y">
                  {upcoming.map((r) => (
                    <li key={r.id} className="group flex items-center gap-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.client}</p>
                        {r.invoice_number && <p className="text-xs text-muted-foreground">{copy.receivables.invoiceShort} {r.invoice_number}</p>}
                        <p className="text-xs text-muted-foreground">
                          {copy.receivables.scheduledOn}{" "}
                          {r.date_prevue ? formatDateFr(r.date_prevue) : copy.receivables.notProvided}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatEUR(r.montant_attendu)}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => confirmPayment(r.id)}><CheckCircle2 className="h-4 w-4" />{copy.receivables.received}</Button>
                      <Button size="sm" variant="ghost" onClick={() => partialPayment(r)}>{copy.receivables.partial}</Button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label={copy.common.delete}
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
                  {copy.receivables.receivedPlural}
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
                          {copy.receivables.receivedOn} {r.date_recu ? formatDateFr(r.date_recu) : copy.receivables.unknownDate}
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-emerald-600">
                        {formatEUR(r.montant_attendu)}
                      </span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label={copy.common.delete}
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
                <span className="text-muted-foreground">{copy.receivables.remaining}</span>
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
