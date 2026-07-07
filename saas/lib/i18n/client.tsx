"use client";

import { createContext, useContext, useMemo } from "react";

import { type Locale } from "./config";
import { makeT, type Messages, type TFunc } from "./core";

const I18nContext = createContext<{ locale: Locale; t: TFunc }>({
  locale: "fr",
  t: (path) => path,
});

// Fournit la langue + la fonction `t` aux composants clients.
// `locale` et `messages` viennent d'un Server Component (layout du dashboard).
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: makeT(messages) }),
    [locale, messages]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
