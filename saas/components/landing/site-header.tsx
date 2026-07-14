"use client";

import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicPreferences } from "@/components/landing/public-preferences";
import { useI18n } from "@/lib/i18n/client";
import { publicCommon } from "@/lib/i18n/public";

const nav = [
  "/features",
  "/solutions",
  "/ai",
  "/security",
];

export function SiteHeader() {
  const { locale } = useI18n();
  const copy = publicCommon[locale];
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 text-slate-950 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 dark:text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Logo variant="light" />
          <Badge className="border-teal/30 bg-teal/10 text-teal">{copy.betaLabel}</Badge>
        </div>

        <nav className="hidden items-center gap-7 lg:flex" aria-label={copy.navLabel}>
          {nav.map((href, index) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              {copy.nav[index]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <PublicPreferences labels={{ language: copy.language, light: copy.light, dark: copy.dark }} />
          <Button variant="ghost" asChild>
            <Link href="/login">{copy.login}</Link>
          </Button>
          <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/signup">{copy.signup}</Link>
          </Button>
        </div>

        <details className="group relative sm:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-white/15 text-slate-200 marker:content-none">
            <Menu className="h-5 w-5 group-open:hidden" />
            <ChevronDown className="hidden h-5 w-5 group-open:block" />
            <span className="sr-only">{copy.openMenu}</span>
          </summary>
          <div className="absolute right-0 top-12 w-72 rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 px-1 pb-3">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{copy.language}</span>
              <PublicPreferences labels={{ language: copy.language, light: copy.light, dark: copy.dark }} />
            </div>
            <nav className="grid gap-1" aria-label={copy.mobileNavLabel}>
          {nav.map((href, index) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  {copy.nav[index]}
                </Link>
              ))}
              <div className="my-2 h-px bg-white/10" />
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm text-slate-200">
                {copy.login}
              </Link>
              <Link href="/signup" className="rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-950">
                {copy.signup}
              </Link>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
