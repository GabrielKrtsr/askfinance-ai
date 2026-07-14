import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { PublicShell } from "@/components/landing/public-shell";
import { getLocale } from "@/lib/i18n/server";

const labels = {
  fr: {
    eyebrow: "Informations légales",
    updated: "Dernière mise à jour",
    warningTitle: "À compléter avant publication commerciale.",
    warning: "Les informations juridiques exactes de l’éditeur, du directeur de publication et de l’hébergeur ne sont pas présentes dans le dépôt. Elles ne sont donc pas inventées ici.",
  },
  en: {
    eyebrow: "Legal information",
    updated: "Last updated",
    warningTitle: "To be completed before commercial publication.",
    warning: "The publisher’s, publication director’s and hosting provider’s exact legal details are not available in the repository. They are therefore not fabricated here.",
  },
  uk: {
    eyebrow: "Правова інформація",
    updated: "Останнє оновлення",
    warningTitle: "Заповніть перед комерційною публікацією.",
    warning: "Точні юридичні дані видавця, директора публікації та хостинг-провайдера відсутні в репозиторії, тому ми їх тут не вигадуємо.",
  },
} as const;

export function LegalDocument({
  title,
  updated,
  incomplete = false,
  children,
}: {
  title: string;
  updated: string;
  incomplete?: boolean;
  children: ReactNode;
}) {
  const copy = labels[getLocale()];
  return (
    <PublicShell>
      <div className="border-b border-white/10 bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{copy.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-slate-500">{copy.updated}: {updated}</p>
        </div>
      </div>
      <div className="bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-slate-50">
        <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          {incomplete && (
            <div className="mb-10 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p><strong>{copy.warningTitle}</strong> {copy.warning}</p>
            </div>
          )}
          <div className="legal-copy">{children}</div>
        </article>
      </div>
    </PublicShell>
  );
}
