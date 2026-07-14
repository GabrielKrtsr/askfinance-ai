"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { type Locale } from "./config";
import { makeT, type Messages, type TFunc } from "./core";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunc;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => undefined,
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
  const [activeLocale, setActiveLocale] = useState(locale);

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  const value = useMemo(
    () => ({ locale: activeLocale, setLocale: setActiveLocale, t: makeT(messages) }),
    [activeLocale, messages]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
