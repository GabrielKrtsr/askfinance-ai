"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  Home,
  SearchX,
  ShieldCheck,
} from "lucide-react";

import { PublicShell } from "@/components/landing/public-shell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

const copies = {
  fr: {
    eyebrow: "Erreur 404",
    title: "Cette page a quitté les comptes.",
    text: "L’adresse demandée n’existe pas, a été déplacée ou n’est plus disponible. Vos données, elles, n’ont pas bougé.",
    home: "Retour à l’accueil",
    login: "Se connecter",
    suggestions: "Vous cherchiez peut-être",
    links: ["Les fonctionnalités", "Les solutions", "Yassia IA"],
    search: "Recherche de page",
    missing: "Aucun résultat à cette adresse",
    safe: "Votre espace reste sécurisé",
  },
  en: {
    eyebrow: "Error 404",
    title: "This page has left the books.",
    text: "The requested address does not exist, has moved or is no longer available. Your data has not moved.",
    home: "Back to homepage",
    login: "Sign in",
    suggestions: "You may be looking for",
    links: ["Features", "Solutions", "Yassia AI"],
    search: "Page search",
    missing: "No result at this address",
    safe: "Your workspace remains secure",
  },
  uk: {
    eyebrow: "Помилка 404",
    title: "Ця сторінка зникла з обліку.",
    text: "Запитана адреса не існує, була переміщена або більше недоступна. Ваші дані залишилися на місці.",
    home: "На головну",
    login: "Увійти",
    suggestions: "Можливо, ви шукали",
    links: ["Можливості", "Рішення", "ШІ Yassia"],
    search: "Пошук сторінки",
    missing: "За цією адресою нічого не знайдено",
    safe: "Ваш простір залишається захищеним",
  },
} as const;

const suggestions = [
  { href: "/features", icon: ChartNoAxesCombined },
  { href: "/solutions", icon: ShieldCheck },
  { href: "/ai", icon: Bot },
] as const;

export default function NotFoundPage() {
  const { locale } = useI18n();
  const copy = copies[locale];

  return (
    <PublicShell>
      <section className="public-grid relative isolate overflow-hidden">
        <div className="public-glow pointer-events-none absolute inset-0 -z-20" />
        <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:border-white/15 dark:bg-white/5 dark:text-teal">
              <SearchX className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>

            <p className="mt-5 bg-gradient-to-r from-primary via-violet-500 to-teal bg-clip-text text-[7rem] font-semibold leading-none tracking-[-0.08em] text-transparent sm:text-[10rem]">
              404
            </p>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-7 text-slate-600 dark:text-slate-300 lg:mx-0 sm:text-lg">
              {copy.text}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button size="lg" asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  {copy.home}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-primary/30 bg-indigo-50/80 text-primary hover:border-primary/50 hover:bg-indigo-100 hover:text-primary dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Link href="/login">
                  {copy.login}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {copy.suggestions}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
                {suggestions.map(({ href, icon: Icon }, index) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {copy.links[index]}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl lg:block" aria-hidden="true">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/10 blur-3xl" />
            <div className="rotate-[1.5deg] overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-2xl shadow-slate-950/15 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/40">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div className="ml-3 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  askfinance.ai/page-introuvable
                </div>
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {copy.search}
                </p>
                <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-7 text-center dark:border-white/15 dark:bg-white/[0.03]">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-lg shadow-primary/10 dark:bg-white/10 dark:text-teal">
                    <SearchX className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">
                    {copy.missing}
                  </p>
                  <div className="mx-auto mt-5 h-2 w-3/4 rounded-full bg-slate-200 dark:bg-white/10" />
                  <div className="mx-auto mt-2 h-2 w-1/2 rounded-full bg-slate-100 dark:bg-white/5" />
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-xs font-medium text-teal-700 dark:text-teal">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.safe}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
