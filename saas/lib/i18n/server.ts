import { cookies } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "./config";
import { makeT, type TFunc } from "./core";
import { getDictionary } from "./dictionaries";

// Langue courante côté serveur (lue depuis le cookie `locale`).
export function getLocale(): Locale {
  const value = cookies().get("locale")?.value;
  return isLocale(value) ? value : defaultLocale;
}

// Helper de traduction pour les Server Components.
export function getT(): { locale: Locale; t: TFunc } {
  const locale = getLocale();
  return { locale, t: makeT(getDictionary(locale)) };
}
