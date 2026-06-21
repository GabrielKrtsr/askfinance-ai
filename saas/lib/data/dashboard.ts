import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { formatEUR, formatDateFr } from "@/lib/utils";

// ---------- Types exposés à l'UI ----------

export interface Profile {
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  email: string;
}

export interface Kpi {
  label: string;
  value: string;
  delta: string; // "—" si non calculable
  trend: "up" | "down"; // sens de la flèche (signe de la variation)
  positive: boolean; // la variation est-elle une bonne nouvelle ? (couleur)
  hint: string;
}

export interface CashflowPoint {
  mois: string;
  revenus: number;
  depenses: number;
}

export interface CategorySlice {
  categorie: string;
  montant: number;
  couleur: string;
}

export interface BudgetRow {
  categorie: string;
  depense: number;
  budget: number;
}

export interface RecentTransaction {
  id: string;
  merchant: string;
  dateLabel: string;
  category: string;
  amount: number;
  type: "debit" | "credit";
}

export interface MonthOption {
  value: string; // "AAAA-MM"
  label: string; // "Juin 2026"
}

export interface DashboardData {
  kpis: Kpi[];
  cashflow: CashflowPoint[];
  categories: CategorySlice[];
  budgets: BudgetRow[];
  recent: RecentTransaction[];
  availableCategories: string[]; // catégories de dépenses présentes (pour les budgets)
  months: MonthOption[]; // mois présents en base (pour le sélecteur)
  selectedMonth: string; // mois affiché ("AAAA-MM")
  hasData: boolean;
}

interface DbTransaction {
  id: string;
  date: string; // ISO "AAAA-MM-JJ"
  merchant: string;
  category: string;
  account: string | null;
  amount: number;
  type: "debit" | "credit";
  status: string;
}

// ---------- Constantes ----------

const MOIS_FR = [
  "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

const MOIS_FULL = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const COULEURS = [
  "#4f46e5", "#14b8a6", "#6366f1", "#0ea5e9", "#f59e0b",
  "#ec4899", "#8b5cf6", "#10b981", "#ef4444", "#f97316",
];

// ---------- Helpers ----------

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "AAAA-MM"
}

function moisLabel(key: string): string {
  const m = Number(key.slice(5, 7));
  return MOIS_FR[m - 1] ?? key;
}

function monthFullLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MOIS_FULL[m - 1] ?? key} ${y}`;
}

function previousMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDelta(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")} %`;
}

// Renvoie la 1re valeur non vide (utile pour les cascades de repli).
function firstNonEmpty(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function buildKpi(
  label: string,
  value: string,
  deltaPct: number | null,
  lowerIsBetter = false // true pour les dépenses : baisser est positif
): Kpi {
  if (deltaPct === null) {
    return { label, value, delta: "—", trend: "up", positive: true, hint: "" };
  }
  return {
    label,
    value,
    delta: formatDelta(deltaPct),
    trend: deltaPct >= 0 ? "up" : "down",
    positive: lowerIsBetter ? deltaPct <= 0 : deltaPct >= 0,
    hint: "vs mois dernier",
  };
}

function emptyKpis(): Kpi[] {
  return [
    buildKpi("Solde total", formatEUR(0), null),
    buildKpi("Dépenses du mois", formatEUR(0), null),
    buildKpi("Revenus du mois", formatEUR(0), null),
    buildKpi("Taux d'épargne", "0 %", null),
  ];
}

// ---------- Profil de l'utilisateur connecté ----------

// `cache` déduplique l'appel sur une même requête (layout + page).
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  // Google ne fournit souvent que le nom complet → on le découpe en repli.
  const fullMeta = meta.full_name ?? meta.name ?? "";
  const [metaFirst, ...metaRest] = fullMeta.split(" ");

  const firstName = firstNonEmpty(
    profile?.first_name,
    meta.first_name,
    meta.given_name,
    metaFirst
  );
  const lastName = firstNonEmpty(
    profile?.last_name,
    meta.last_name,
    meta.family_name,
    metaRest.join(" ")
  );
  const email = user.email ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || email;
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "") || email[0] || "?").toUpperCase();

  return { firstName, lastName, fullName, initials, email };
});

// ---------- Données agrégées du dashboard ----------

export async function getDashboardData(
  selectedMonth?: string
): Promise<DashboardData> {
  const supabase = createClient();

  // Le RLS filtre déjà sur l'utilisateur connecté (user_id = auth.uid()).
  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, merchant, category, account, amount, type, status")
    .order("date", { ascending: false });

  const txns: DbTransaction[] = (data ?? []).map((t) => ({
    ...(t as DbTransaction),
    amount: Number((t as DbTransaction).amount), // numeric → number
  }));

  if (error || txns.length === 0) {
    return {
      kpis: emptyKpis(),
      cashflow: [],
      categories: [],
      budgets: [],
      recent: [],
      availableCategories: [],
      months: [],
      selectedMonth: "",
      hasData: false,
    };
  }

  // Mois disponibles (du plus récent au plus ancien) pour le sélecteur.
  const monthKeys = Array.from(new Set(txns.map((t) => monthKey(t.date)))).sort(
    (a, b) => b.localeCompare(a)
  );
  const months: MonthOption[] = monthKeys.map((k) => ({
    value: k,
    label: monthFullLabel(k),
  }));

  // Mois de référence = celui demandé (s'il existe en base), sinon le plus récent.
  const refKey =
    selectedMonth && monthKeys.includes(selectedMonth)
      ? selectedMonth
      : monthKeys[0];
  const prevKey = previousMonthKey(refKey);

  const sumMonth = (key: string, type: "debit" | "credit") =>
    txns
      .filter((t) => monthKey(t.date) === key && t.type === type)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

  const depMois = sumMonth(refKey, "debit");
  const revMois = sumMonth(refKey, "credit");
  const depPrev = sumMonth(prevKey, "debit");
  const revPrev = sumMonth(prevKey, "credit");
  // Solde cumulé jusqu'à la fin du mois sélectionné.
  const solde = txns
    .filter((t) => monthKey(t.date) <= refKey)
    .reduce((s, t) => s + t.amount, 0);
  const marge = revMois > 0 ? ((revMois - depMois) / revMois) * 100 : 0;
  const margePrev = revPrev > 0 ? ((revPrev - depPrev) / revPrev) * 100 : 0;

  const kpis: Kpi[] = [
    buildKpi("Solde total", formatEUR(solde), null),
    buildKpi("Dépenses du mois", formatEUR(depMois), depPrev > 0 ? ((depMois - depPrev) / depPrev) * 100 : null, true),
    buildKpi("Revenus du mois", formatEUR(revMois), revPrev > 0 ? ((revMois - revPrev) / revPrev) * 100 : null),
    buildKpi("Taux d'épargne", `${marge.toFixed(1).replace(".", ",")} %`, revPrev > 0 ? marge - margePrev : null),
  ];

  // Flux de trésorerie : par mois, 12 plus récents, ordre chronologique.
  const parMois = new Map<string, { revenus: number; depenses: number }>();
  for (const t of txns) {
    const k = monthKey(t.date);
    const e = parMois.get(k) ?? { revenus: 0, depenses: 0 };
    if (t.type === "credit") e.revenus += Math.abs(t.amount);
    else e.depenses += Math.abs(t.amount);
    parMois.set(k, e);
  }
  const cashflow: CashflowPoint[] = Array.from(parMois.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([k, v]) => ({ mois: moisLabel(k), revenus: v.revenus, depenses: v.depenses }));

  // Répartition des dépenses du mois de référence par catégorie.
  const parCat = new Map<string, number>();
  for (const t of txns) {
    if (monthKey(t.date) === refKey && t.type === "debit") {
      parCat.set(t.category, (parCat.get(t.category) ?? 0) + Math.abs(t.amount));
    }
  }
  const categories: CategorySlice[] = Array.from(parCat.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([categorie, montant], i) => ({
      categorie,
      montant,
      couleur: COULEURS[i % COULEURS.length],
    }));

  // Budgets fixés (table budgets) + dépense réelle calculée.
  const { data: budgetRows } = await supabase
    .from("budgets")
    .select("category, amount");
  const budgets: BudgetRow[] = (budgetRows ?? []).map((b) => ({
    categorie: (b as { category: string }).category,
    budget: Number((b as { amount: number }).amount),
    depense: parCat.get((b as { category: string }).category) ?? 0,
  }));

  // 6 transactions les plus récentes.
  const recent: RecentTransaction[] = txns.slice(0, 6).map((t) => ({
    id: t.id,
    merchant: t.merchant,
    dateLabel: formatDateFr(t.date),
    category: t.category,
    amount: t.amount,
    type: t.type,
  }));

  // Catégories de dépenses présentes (toutes périodes) → pour créer des budgets.
  const availableCategories = Array.from(
    new Set(txns.filter((t) => t.type === "debit").map((t) => t.category))
  ).sort((a, b) => a.localeCompare(b));

  return {
    kpis,
    cashflow,
    categories,
    budgets,
    recent,
    availableCategories,
    months,
    selectedMonth: refKey,
    hasData: true,
  };
}
