import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PageHero } from "@/components/landing/page-hero";
import { PublicShell } from "@/components/landing/public-shell";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { getLocale } from "@/lib/i18n/server";

const labels = {
  fr: { create: "Créer cet espace", promise: "La promesse", start: "Prise en main", decision: "Des données à une décision utile.", try: "Essayer pendant la bêta" },
  en: { create: "Create this workspace", promise: "The promise", start: "Getting started", decision: "From data to a useful decision.", try: "Try during the beta" },
  uk: { create: "Створити цей простір", promise: "Обіцянка", start: "Початок роботи", decision: "Від даних до корисного рішення.", try: "Спробувати бета-версію" },
} as const;

export interface SolutionBlock {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function SolutionDetail({
  eyebrow,
  title,
  description,
  promise,
  blocks,
  steps,
  note,
}: {
  eyebrow: string;
  title: string;
  description: string;
  promise: string;
  blocks: SolutionBlock[];
  steps: string[];
  note: string;
}) {
  const copy = labels[getLocale()];
  return (
    <PublicShell>
      <PageHero eyebrow={eyebrow} title={title} description={description}>
        <Button size="lg" asChild className="bg-white text-slate-950 hover:bg-slate-100">
          <Link href="/signup">{copy.create} <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </PageHero>

      <section className="bg-slate-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{copy.promise}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold text-white sm:text-5xl">{promise}</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {blocks.map((block, index) => (
              <Reveal key={block.title} delay={(index % 3) * 0.06} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <block.icon className="h-5 w-5 text-teal" />
                <h3 className="mt-5 font-semibold text-white">{block.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{block.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{copy.start}</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">{copy.decision}</h2>
          </Reveal>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <Reveal key={step} delay={index * 0.06} className="flex gap-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-semibold text-teal">{index + 1}</span>
                <p className="pt-1 text-sm leading-6 text-slate-300">{step}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-950 py-20">
        <Reveal className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <CheckCircle2 className="mx-auto h-7 w-7 text-teal" />
          <p className="mt-4 text-balance text-lg leading-8 text-slate-300">{note}</p>
          <Button asChild className="mt-8 bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/signup">{copy.try} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Reveal>
      </section>
    </PublicShell>
  );
}
