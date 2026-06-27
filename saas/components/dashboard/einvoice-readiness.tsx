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

// Échéances clés de la réforme (source : economie.gouv.fr).
const DEADLINE_RECEPTION = new Date("2026-09-01T00:00:00");
const DEADLINE_EMISSION_TPE = new Date("2027-09-01T00:00:00");

// Les 4 nouvelles mentions obligatoires sur les factures (au 1er sept. 2026).
const NOUVELLES_MENTIONS = [
  "Le numéro SIREN du client",
  "La catégorie de l'opération (livraison de biens, prestation de services, ou les deux)",
  "L'option pour le paiement de la TVA sur les débits, le cas échéant",
  "L'adresse de livraison des biens si elle diffère de l'adresse de facturation",
];

// Étapes de préparation (clé persistée + libellé).
const CHECKLIST: { key: string; label: string }[] = [
  { key: "reception", label: "Pouvoir recevoir des factures électroniques (dès le 1er sept. 2026)" },
  { key: "pdp", label: "Choisir une plateforme de dématérialisation partenaire (PDP)" },
  { key: "annuaire", label: "Vérifier vos coordonnées légales (SIREN) pour l'annuaire" },
  { key: "format", label: "S'assurer que votre outil gère le format Factur-X / UBL / CII" },
  { key: "mentions", label: "Ajouter les 4 nouvelles mentions obligatoires sur vos factures" },
  { key: "ereporting", label: "Prévoir la transmission des données de e-reporting" },
  { key: "clients", label: "Informer vos clients et fournisseurs du passage à l'e-facture" },
];

function daysUntil(target: Date): number {
  const ms = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function Countdown({ label, target }: { label: string; target: Date }) {
  const days = daysUntil(target);
  return (
    <div className="flex-1 rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight">
        {days > 0 ? `J−${days}` : "En vigueur"}
      </p>
      <p className="text-xs text-muted-foreground">
        {target.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

export function EInvoiceReadiness() {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEInvoiceChecklist()
      .then(setState)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: string) {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next })); // optimiste
    const ok = await toggleEInvoiceItem(key, next);
    if (!ok) {
      setState((s) => ({ ...s, [key]: !next })); // revert
      toast.error("Impossible d'enregistrer. Réessayez.");
    }
  }

  const done = CHECKLIST.filter((i) => state[i.key]).length;
  const pct = Math.round((done / CHECKLIST.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Facture électronique 2026 — êtes-vous prêt ?
        </CardTitle>
        <CardDescription>
          La réforme devient obligatoire. Préparez votre entreprise étape par
          étape.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Comptes à rebours */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Countdown label="Réception obligatoire (toutes les entreprises)" target={DEADLINE_RECEPTION} />
          <Countdown label="Émission obligatoire (TPE / PME)" target={DEADLINE_EMISSION_TPE} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Checklist de préparation */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Votre préparation</p>
              <span className="text-xs text-muted-foreground">
                {done}/{CHECKLIST.length}
              </span>
            </div>
            <Progress value={pct} indicatorClassName="bg-teal" />
            <ul className="mt-3 space-y-1.5">
              {CHECKLIST.map((item) => {
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
              4 nouvelles mentions obligatoires
            </p>
            <ul className="space-y-2">
              {NOUVELLES_MENTIONS.map((m, i) => (
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
              Source officielle (economie.gouv.fr)
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
