import { type Locale } from "./config";
import { type Messages } from "./core";
import fr from "./messages/fr";
import en from "./messages/en";
import uk from "./messages/uk";

const dictionaries: Record<Locale, Messages> = { fr, en, uk };

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? fr;
}
