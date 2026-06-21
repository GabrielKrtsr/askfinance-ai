import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";

// Résultat renvoyé à l'UI après un import.
export interface ImportResult {
  inserted: number; // lignes insérées en base
  skipped: number; // lignes ignorées (invalides)
  errors: string[]; // messages d'erreur détaillés
}

// Une ligne brute du CSV : clés = en-têtes du fichier, valeurs = texte.
type RawRow = Record<string, string>;

// La forme d'une transaction prête à insérer dans Supabase.
interface TransactionInsert {
  user_id: string;
  date: string; // ISO "AAAA-MM-JJ"
  merchant: string;
  category: string;
  account: string | null;
  amount: number; // négatif = débit
  type: "debit" | "credit";
  status: string;
}

// Normalise un en-tête : enlève le BOM, les accents, met en minuscules.
// Ainsi "Libellé" et "libelle" pointent vers la même colonne.
function normalizeKey(key: string): string {
  return key
    .replace(/^﻿/, "") // BOM éventuel en tête de fichier
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .trim();
}

// Renvoie la 1re valeur trouvée parmi une liste d'en-têtes possibles (alias).
function pick(row: RawRow, aliases: string[]): string | undefined {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a].trim() !== "") return row[a].trim();
  }
  return undefined;
}

// "8 200,50 €" / "-512,34" → -512.34. Gère espaces, € et virgule décimale.
function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s ]/g, "") // espaces normaux et insécables
    .replace(/€|eur/gi, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Résout le montant depuis soit une colonne unique signée, soit deux
// colonnes séparées Débit/Crédit (format bancaire français courant).
function resolveAmount(montant?: string, debit?: string, credit?: string): number | null {
  if (montant) return parseAmount(montant);
  if (credit) {
    const c = parseAmount(credit);
    return c === null ? null : Math.abs(c); // crédit = positif
  }
  if (debit) {
    const d = parseAmount(debit);
    return d === null ? null : -Math.abs(d); // débit = négatif
  }
  return null;
}

// "10/06/2026" ou "2026-06-10" → "2026-06-10" (format attendu par Postgres).
function parseDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

// Parse le CSV en mémoire et renvoie les lignes brutes.
function parseCsv(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeKey,
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });
}

/**
 * Service principal : lit un relevé CSV, le transforme en transactions
 * et les insère dans Supabase pour l'utilisateur connecté.
 *
 * Colonnes attendues (insensibles à la casse/aux accents) :
 *   - date      (requis)  → date | "date operation"
 *   - libellé   (requis)  → libelle | merchant | description | intitule
 *   - montant   (requis)  → montant | amount | valeur   (négatif = dépense)
 *   - catégorie (option.) → categorie | category        (défaut "Non catégorisé")
 *   - compte    (option.) → compte | account
 */
export async function importTransactionsFromCsv(file: File): Promise<ImportResult> {
  const errors: string[] = [];

  // 1. Parser le fichier
  const rows = await parseCsv(file);

  // 2. Identifier l'utilisateur connecté (pour le user_id de chaque ligne)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { inserted: 0, skipped: rows.length, errors: ["Vous devez être connecté."] };
  }

  // 3. Mapper et valider chaque ligne
  const toInsert: TransactionInsert[] = [];

  rows.forEach((row, i) => {
    const ligne = i + 2; // +1 pour l'en-tête, +1 car i démarre à 0

    const dateRaw = pick(row, [
      "date",
      "date operation",
      "date d'operation",
      "date de comptabilisation",
      "date de valeur",
    ]);
    const merchant = pick(row, [
      "libelle simplifie",
      "libelle operation",
      "libelle",
      "merchant",
      "label",
      "description",
      "intitule",
    ]);

    // Montant : colonne unique signée, OU colonnes Débit/Crédit séparées.
    const montantRaw = pick(row, ["montant", "amount", "valeur"]);
    const debitRaw = pick(row, ["debit"]);
    const creditRaw = pick(row, ["credit"]);

    if (!dateRaw || !merchant || (!montantRaw && !debitRaw && !creditRaw)) {
      errors.push(`Ligne ${ligne} : colonnes date / libellé / montant manquantes.`);
      return;
    }

    const date = parseDate(dateRaw);
    if (!date) {
      errors.push(`Ligne ${ligne} : date invalide « ${dateRaw} ».`);
      return;
    }

    const amount = resolveAmount(montantRaw, debitRaw, creditRaw);
    if (amount === null) {
      errors.push(`Ligne ${ligne} : montant invalide.`);
      return;
    }

    toInsert.push({
      user_id: user.id,
      date,
      merchant,
      category: pick(row, ["categorie", "category"]) ?? "Non catégorisé",
      account: pick(row, ["compte", "account"]) ?? null,
      amount,
      type: amount < 0 ? "debit" : "credit",
      status: "Validé",
    });
  });

  // 4. Insérer en base (le RLS garantit que user_id = utilisateur connecté)
  if (toInsert.length === 0) {
    return { inserted: 0, skipped: rows.length, errors };
  }

  const { error } = await supabase.from("transactions").insert(toInsert);
  if (error) {
    return { inserted: 0, skipped: rows.length, errors: [...errors, error.message] };
  }

  return { inserted: toInsert.length, skipped: errors.length, errors };
}
