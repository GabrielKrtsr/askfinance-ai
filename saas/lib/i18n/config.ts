// Configuration i18n : langues disponibles + langue par défaut.
export const locales = ["fr", "en", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

// Noms natifs affichés dans le sélecteur de langue.
export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  uk: "Українська",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
