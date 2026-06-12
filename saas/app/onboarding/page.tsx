"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  PartyPopper,
  UploadCloud,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Import du fichier" },
  { id: 2, label: "Vérification des colonnes" },
  { id: 3, label: "Confirmation" },
];

// Aperçu figé d'un CSV importé
const previewRows = [
  ["02/06/2026", "SALAIRES JUIN LOT", "-8200,00", "Compte courant Pro"],
  ["03/06/2026", "SCI DES LILAS LOYER", "-2600,00", "Compte courant Pro"],
  ["05/06/2026", "VIR STUDIO MARBRE", "+4200,00", "Compte courant Pro"],
  ["08/06/2026", "METRO CASH CARRY", "-512,34", "Compte courant Pro"],
  ["09/06/2026", "OVHCLOUD", "-89,90", "Carte Pro Visa"],
];

const columnMapping = [
  { source: "Colonne A", sample: "02/06/2026", target: "date" },
  { source: "Colonne B", sample: "SALAIRES JUIN LOT", target: "merchant" },
  { source: "Colonne C", sample: "-8200,00", target: "amount" },
  { source: "Colonne D", sample: "Compte courant Pro", target: "account" },
];

const targetFields = [
  { value: "date", label: "Date" },
  { value: "merchant", label: "Libellé / Bénéficiaire" },
  { value: "amount", label: "Montant" },
  { value: "account", label: "Compte" },
  { value: "ignore", label: "Ignorer" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [uploaded, setUploaded] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-sm text-muted-foreground">
            Étape {step} sur 3
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {/* Stepper */}
        <ol className="mb-10 flex items-center">
          {steps.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <li key={s.id} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      done && "border-teal bg-teal text-white",
                      active && "border-primary bg-primary text-white",
                      !done && !active && "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : s.id}
                  </span>
                  <span
                    className={cn(
                      "hidden text-sm font-medium sm:block",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-px flex-1",
                      step > s.id ? "bg-teal" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Étape 1 : import */}
        {step === 1 && (
          <Card className="animate-fade-in p-8">
            <h1 className="text-xl font-bold tracking-tight">
              Importez votre relevé bancaire
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Exportez un fichier CSV depuis votre banque, puis déposez-le
              ci-dessous. Vos données restent privées.
            </p>

            <button
              type="button"
              onClick={() => setUploaded(true)}
              className={cn(
                "mt-6 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                uploaded
                  ? "border-teal/60 bg-teal/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {uploaded ? (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-teal">
                    <FileSpreadsheet className="h-6 w-6" />
                  </span>
                  <p className="mt-3 font-medium">releve-juin-2026.csv</p>
                  <p className="text-sm text-muted-foreground">
                    142 transactions détectées · 28 Ko
                  </p>
                </>
              ) : (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UploadCloud className="h-6 w-6" />
                  </span>
                  <p className="mt-3 font-medium">
                    Glissez votre fichier CSV ici
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou cliquez pour parcourir · CSV, OFX, QIF
                  </p>
                </>
              )}
            </button>

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" asChild>
                <Link href="/signup">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Link>
              </Button>
              <Button onClick={() => setStep(2)} disabled={!uploaded}>
                Continuer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Étape 2 : mapping des colonnes */}
        {step === 2 && (
          <Card className="animate-fade-in p-8">
            <h1 className="text-xl font-bold tracking-tight">
              Vérifiez la correspondance des colonnes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Nous avons détecté automatiquement vos colonnes. Ajustez-les si
              nécessaire.
            </p>

            <div className="mt-6 space-y-3">
              {columnMapping.map((col) => (
                <div
                  key={col.source}
                  className="grid grid-cols-1 items-center gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_auto_1fr]"
                >
                  <div>
                    <p className="text-sm font-medium">{col.source}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      ex. « {col.sample} »
                    </p>
                  </div>
                  <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  <Select defaultValue={col.target}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                Aperçu des 5 premières lignes
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Libellé</th>
                      <th className="px-4 py-2 text-right font-medium">Montant</th>
                      <th className="px-4 py-2 font-medium">Compte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-4 py-2">{row[0]}</td>
                        <td className="px-4 py-2">{row[1]}</td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-4 py-2 text-right font-medium",
                            row[2].startsWith("+")
                              ? "text-emerald-600"
                              : "text-foreground"
                          )}
                        >
                          {row[2]} €
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                          {row[3]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button onClick={() => setStep(3)}>
                Importer 142 transactions
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Étape 3 : confirmation */}
        {step === 3 && (
          <Card className="animate-fade-in p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal">
              <PartyPopper className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              Tout est prêt, Camille !
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              142 transactions ont été importées et catégorisées
              automatiquement. Votre tableau de bord vous attend.
            </p>

            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
              {[
                { v: "142", l: "transactions" },
                { v: "9", l: "catégories" },
                { v: "2", l: "comptes" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>

            <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
              <Link href="/dashboard">
                Accéder au tableau de bord
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
