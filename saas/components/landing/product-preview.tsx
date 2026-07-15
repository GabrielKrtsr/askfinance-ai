"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, LockKeyhole, MoreHorizontal, RotateCw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

const copies = {
  fr: { cards: [["Trésorerie", "+8,4 %"], ["À encaisser", "3 factures"], ["Dépenses", "+3,1 %"]], forecast: "Prévision à 90 jours", forecastText: "Flux observés et charges récurrentes", scenario: "Scénario pilotage", yassia: "Yassia prépare le point", todo: "2 éléments à traiter", positive: "Trésorerie positive", demoAddress: "Adresse de démonstration : https://askfinance.ai/dashboard" },
  en: { cards: [["Cash", "+8.4%"], ["Receivables", "3 invoices"], ["Expenses", "+3.1%"]], forecast: "90-day forecast", forecastText: "Observed flows and recurring charges", scenario: "Management scenario", yassia: "Yassia prepares the review", todo: "2 items to handle", positive: "Positive cash position", demoAddress: "Demo address: https://askfinance.ai/dashboard" },
  uk: { cards: [["Кошти", "+8,4 %"], ["До отримання", "3 рахунки"], ["Витрати", "+3,1 %"]], forecast: "Прогноз на 90 днів", forecastText: "Спостережені потоки й регулярні витрати", scenario: "Сценарій керування", yassia: "Yassia готує огляд", todo: "2 пункти до розгляду", positive: "Позитивна ліквідність", demoAddress: "Демонстраційна адреса: https://askfinance.ai/dashboard" },
} as const;

export function ProductPreview() {
  const { locale } = useI18n();
  const copy = copies[locale];
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/20 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-black/40">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div
            className="mx-auto flex w-full max-w-lg items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] text-slate-500 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400"
            aria-label={copy.demoAddress}
          >
            <LockKeyhole className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="min-w-0 truncate">
              <span className="hidden text-slate-400 sm:inline dark:text-slate-500">https://</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">askfinance.ai</span>
              <span className="text-slate-400 dark:text-slate-500">/dashboard</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500" aria-hidden="true">
            <RotateCw className="hidden h-3.5 w-3.5 sm:block" />
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
          {copy.cards.map(([label, delta], index) => (
            <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-semibold text-white">{["48 250 €", "12 400 €", "18 940 €"][index]}</p>
              <p className={index < 2 ? "mt-2 flex items-center gap-1 text-xs text-teal" : "mt-2 flex items-center gap-1 text-xs text-amber-300"}>
                {index < 2 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {delta}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{copy.forecast}</p>
                <p className="text-xs text-slate-500">{copy.forecastText}</p>
              </div>
              <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-medium text-teal">{copy.scenario}</span>
            </div>
            <div className="mt-6 flex h-32 items-end gap-2">
              {[38, 45, 42, 58, 54, 68, 63, 76, 72, 84, 80, 92].map((height, index) => (
                <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4 text-teal" /> {copy.yassia}
            </div>
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3">
              <p className="flex items-center gap-2 text-xs text-amber-200"><AlertTriangle className="h-3.5 w-3.5" /> {copy.todo}</p>
            </div>
            <div className="rounded-lg border border-teal/20 bg-teal/5 p-3">
              <p className="flex items-center gap-2 text-xs text-teal"><CheckCircle2 className="h-3.5 w-3.5" /> {copy.positive}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
