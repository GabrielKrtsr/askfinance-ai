"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe2, LoaderCircle, Moon, Sun } from "lucide-react";

import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type PublicTheme = "light" | "dark";

function applyTheme(theme: PublicTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function PublicPreferences({
  labels,
}: {
  labels: { language: string; light: string; dark: string };
}) {
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const [theme, setTheme] = useState<PublicTheme>("light");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const initial: PublicTheme = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  function chooseLanguage(value: Locale) {
    if (value === locale) return;
    setLocale(value);
    document.cookie = `locale=${value}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={locale} onValueChange={(value) => chooseLanguage(value as Locale)}>
        <SelectTrigger
          aria-label={labels.language}
          className="h-9 w-[88px] shrink-0 gap-1.5 rounded-xl border-slate-200 bg-white/90 px-2.5 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-950/5 transition-colors hover:border-primary/30 hover:bg-indigo-50 focus:ring-primary/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:shadow-black/20 dark:hover:border-white/25 dark:hover:bg-white/10 [&>svg]:h-3.5 [&>svg]:w-3.5"
        >
          <span className="flex items-center gap-2">
            {isPending ? (
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            ) : (
              <Globe2 className="h-3.5 w-3.5 shrink-0 text-teal" />
            )}
            <span className="tracking-[0.08em]">
              {locale === "uk" ? "UA" : locale.toUpperCase()}
            </span>
          </span>
        </SelectTrigger>
        <SelectContent className="z-[80] min-w-[208px] rounded-2xl border-slate-200 bg-white p-2 text-slate-950 shadow-[0_20px_55px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-slate-950 dark:text-white">
          {locales.map((value) => (
            <SelectItem
              key={value}
              value={value}
              className="my-0.5 gap-2 rounded-xl py-2.5 pl-9 pr-3 font-medium focus:bg-indigo-50 focus:text-primary dark:focus:bg-white/10 dark:focus:text-white"
            >
              <span className="mr-2 inline-flex h-6 w-8 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {value === "uk" ? "UA" : value.toUpperCase()}
              </span>
              {localeNames[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-current/15 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        aria-label={theme === "light" ? labels.dark : labels.light}
        title={theme === "light" ? labels.dark : labels.light}
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </div>
  );
}
