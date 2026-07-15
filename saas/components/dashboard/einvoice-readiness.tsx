"use client";

import { useEffect, useState } from "react";
import { FileText, Check, CalendarClock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getEInvoiceChecklist,
  toggleEInvoiceItem,
} from "@/lib/services/einvoice";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";
import type { Locale } from "@/lib/i18n/config";

// Échéances clés de la réforme (source : economie.gouv.fr).
const DEADLINE_RECEPTION = new Date("2026-09-01T00:00:00");
const DEADLINE_EMISSION_TPE = new Date("2027-09-01T00:00:00");

const CHECKLIST_KEYS = ["reception", "pdp", "annuaire", "format", "mentions", "ereporting", "clients"];

function daysUntil(target: Date): number {
  const ms = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function Countdown({ label, target, locale, dayPrefix, inForce }: { label: string; target: Date; locale: Locale; dayPrefix: string; inForce: string }) {
  const days = daysUntil(target);
  return (
    <div className="flex-1 rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight">
        {days > 0 ? `${dayPrefix}${days}` : inForce}
      </p>
      <p className="text-xs text-muted-foreground">
        {target.toLocaleDateString(locale === "fr" ? "fr-FR" : locale === "uk" ? "uk-UA" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

export function EInvoiceReadiness({ workspaceId }: { workspaceId: string }) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale].einvoice;
  const checklist = CHECKLIST_KEYS.map((key, index) => ({ key, label: copy.checklist[index] }));
  const [state, setState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEInvoiceChecklist(workspaceId)
      .then(setState)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function toggle(key: string) {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next })); // optimiste
    const ok = await toggleEInvoiceItem(workspaceId, key, next);
    if (!ok) {
      setState((s) => ({ ...s, [key]: !next })); // revert
      toast.error(copy.saveFailed);
    }
  }

  const done = checklist.filter((i) => state[i.key]).length;
  const pct = Math.round((done / checklist.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {copy.title}
        </CardTitle>
        <CardDescription>
          {copy.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Comptes à rebours */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Countdown label={copy.receptionDeadline} target={DEADLINE_RECEPTION} locale={locale} dayPrefix={copy.dayPrefix} inForce={copy.inForce} />
          <Countdown label={copy.emissionDeadline} target={DEADLINE_EMISSION_TPE} locale={locale} dayPrefix={copy.dayPrefix} inForce={copy.inForce} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Checklist de préparation */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{copy.progress}</p>
              <span className="text-xs text-muted-foreground">
                {done}/{checklist.length}
              </span>
            </div>
            <Progress value={pct} indicatorClassName="bg-teal" />
            <ul className="mt-3 space-y-1.5">
              {checklist.map((item) => {
                const checked = Boolean(state[item.key]);
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => toggle(item.key)}
                      disabled={loading}
                      className="flex w-full items-start gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-teal bg-teal text-white"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          checked && "text-muted-foreground line-through"
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Nouvelles mentions obligatoires */}
          <div>
            <p className="mb-2 text-sm font-medium">
              {copy.mentions}
            </p>
            <ul className="space-y-2">
              {copy.newMentions.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{m}</span>
                </li>
              ))}
            </ul>
            <a
              href="https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {copy.officialSource}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
