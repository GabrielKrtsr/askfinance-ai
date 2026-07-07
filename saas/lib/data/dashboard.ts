import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace, type WorkspaceType } from "@/lib/data/workspace";
import { formatEUR, formatDateFr } from "@/lib/utils";
import { type TFunc } from "@/lib/i18n/core";

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

export interface AccountOption {
  value: string; // id du compte
  label: string; // nom du compte
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
  accounts: AccountOption[]; // comptes de l'utilisateur (pour le sélecteur)
  selectedAccount: string; // "all" ou l'id du compte affiché
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
  is_transfer: boolean;
  account_id: string | null;
}

interface DbAccount {
  id: string;
  name: string;
  opening_balance: number;
}

// ---------- Constantes ----------

const COULEURS = [
  "#4f46e5", "#14b8a6", "#6366f1", "#0ea5e9", "#f59e0b",
  "#ec4899", "#8b5cf6", "#10b981", "#ef4444", "#f97316",
];

// ---------- Helpers ----------

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "AAAA-MM"
}

// Libellés de mois localisés via Intl (fr/en/uk…) à partir de la clé "AAAA-MM".
function moisLabel(key: string, locale = "fr"): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const s = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthFullLabel(key: string, locale = "fr"): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const s = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  opts: { lowerIsBetter?: boolean; hint?: string } = {}
): Kpi {
  if (deltaPct === null) {
    return { label, value, delta: "—", trend: "up", positive: true, hint: "" };
  }
  const lowerIsBetter = opts.lowerIsBetter ?? false; // true pour les dépenses
  return {
    label,
    value,
    delta: formatDelta(deltaPct),
    trend: deltaPct >= 0 ? "up" : "down",
    positive: lowerIsBetter ? deltaPct <= 0 : deltaPct >= 0,
    hint: opts.hint ?? "vs mois dernier",
  };
}

interface KpiLabels {
  balance: string;
  expenses: string;
  revenue: string;
  margin: string;
  remaining: string;
  hint: string;
}

const FR_LABELS: KpiLabels = {
  balance: "Solde de trésorerie",
  expenses: "Dépenses du mois",
  revenue: "Revenus du mois",
  margin: "Marge nette",
  remaining: "Reste à vivre",
  hint: "vs mois dernier",
};

function emptyKpis(
  opening = 0,
  labels: KpiLabels = FR_LABELS,
  kind: WorkspaceType = "business"
): Kpi[] {
  return [
    buildKpi(labels.balance, formatEUR(opening), null),
    buildKpi(labels.expenses, formatEUR(0), null),
    buildKpi(labels.revenue, formatEUR(0), null),
    kind === "personal"
      ? buildKpi(labels.remaining, formatEUR(0), null)
      : buildKpi(labels.margin, "0 %", null),
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
  selectedMonth?: string,
  selectedAccount?: string,
  i18n?: { t: TFunc; locale: string },
  kind: WorkspaceType = "business"
): Promise<DashboardData> {
  const supabase = createClient();
  const locale = i18n?.locale ?? "fr";
  const labels: KpiLabels = i18n
    ? {
        balance: i18n.t(
          kind === "personal" ? "dashboard.kpiBalancePerso" : "dashboard.kpiBalance"
        ),
        expenses: i18n.t("dashboard.kpiExpenses"),
        revenue: i18n.t("dashboard.kpiRevenue"),
        margin: i18n.t("dashboard.kpiMargin"),
        remaining: i18n.t("dashboard.kpiRemaining"),
        hint: i18n.t("dashboard.vsLastMonth"),
      }
    : FR_LABELS;

  // Aucun espace courant → tableau de bord vide.
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return {
      kpis: emptyKpis(0, labels, kind),
      cashflow: [],
      categories: [],
      budgets: [],
      recent: [],
      availableCategories: [],
      months: [],
      selectedMonth: "",
      accounts: [],
      selectedAccount: "all",
      hasData: false,
    };
  }

  // Comptes de l'espace (pour le sélecteur + soldes d'ouverture).
  const { data: accountRows } = await supabase
    .from("accounts")
    .select("id, name, opening_balance")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });
  const accountsData = (accountRows ?? []) as DbAccount[];
  const accounts: AccountOption[] = accountsData.map((a) => ({
    value: a.id,
    label: a.name,
  }));

  // Compte sélectionné : "all" par défaut (ou si l'id demandé n'existe pas).
  const accountFilter =
    selectedAccount &&
    selectedAccount !== "all" &&
    accountsData.some((a) => a.id === selectedAccount)
      ? selectedAccount
      : "all";

  // Solde d'ouverture du périmètre affiché.
  const openingTotal =
    accountFilter === "all"
      ? accountsData.reduce((s, a) => s + Number(a.opening_balance), 0)
      : Number(
          accountsData.find((a) => a.id === accountFilter)?.opening_balance ?? 0
        );

  // Transactions (RLS = utilisateur connecté), filtrées par compte si besoin.
  let query = supabase
    .from("transactions")
    .select(
      "id, date, label, category, amount, direction, status, is_transfer, account_id"
    )
    .eq("workspace_id", workspace.id)
    .order("date", { ascending: false });
  if (accountFilter !== "all") query = query.eq("account_id", accountFilter);
  const { data, error } = await query;

  interface TxRow {
    id: string;
    date: string;
    label: string;
    category: string;
    amount: number;
    direction: "debit" | "credit";
    status: string;
    is_transfer: boolean;
    account_id: string | null;
  }
  const txns: DbTransaction[] = ((data ?? []) as unknown as TxRow[]).map((t) => ({
    id: t.id,
    date: t.date,
    merchant: t.label,
    category: t.category,
    account: null,
    amount: Number(t.amount), // numeric → number
    type: t.direction,
    status: t.status,
    is_transfer: t.is_transfer,
    account_id: t.account_id,
  }));

  if (error || txns.length === 0) {
    return {
      kpis: emptyKpis(openingTotal, labels, kind),
      cashflow: [],
      categories: [],
      budgets: [],
      recent: [],
      availableCategories: [],
      months: [],
      selectedMonth: "",
      accounts,
      selectedAccount: accountFilter,
      hasData: false,
    };
  }

  // Les virements internes comptent pour le solde mais sont exclus des analyses
  // (dépenses / revenus / catégories / charges).
  const spend = txns.filter((t) => !t.is_transfer);

  // Mois disponibles (du plus récent au plus ancien) pour le sélecteur.
  const monthKeys = Array.from(new Set(txns.map((t) => monthKey(t.date)))).sort(
    (a, b) => b.localeCompare(a)
  );
  const months: MonthOption[] = monthKeys.map((k) => ({
    value: k,
    label: monthFullLabel(k, locale),
  }));

  // Mois de référence = celui demandé (s'il existe en base), sinon le plus récent.
  const refKey =
    selectedMonth && monthKeys.includes(selectedMonth)
      ? selectedMonth
      : monthKeys[0];
  const prevKey = previousMonthKey(refKey);

  const sumMonth = (key: string, type: "debit" | "credit") =>
    spend
      .filter((t) => monthKey(t.date) === key && t.type === type)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

  const depMois = sumMonth(refKey, "debit");
  const revMois = sumMonth(refKey, "credit");
  const depPrev = sumMonth(prevKey, "debit");
  const revPrev = sumMonth(prevKey, "credit");
  // Solde = solde d'ouverture + flux cumulés (virements inclus) jusqu'au mois choisi.
  const solde =
    openingTotal +
    txns
      .filter((t) => monthKey(t.date) <= refKey)
      .reduce((s, t) => s + t.amount, 0);
  const marge = revMois > 0 ? ((revMois - depMois) / revMois) * 100 : 0;
  const margePrev = revPrev > 0 ? ((revPrev - depPrev) / revPrev) * 100 : 0;

  const kpis: Kpi[] = [
    buildKpi(labels.balance, formatEUR(solde), null),
    buildKpi(labels.expenses, formatEUR(depMois), depPrev > 0 ? ((depMois - depPrev) / depPrev) * 100 : null, { lowerIsBetter: true, hint: labels.hint }),
    buildKpi(labels.revenue, formatEUR(revMois), revPrev > 0 ? ((revMois - revPrev) / revPrev) * 100 : null, { hint: labels.hint }),
    kind === "personal"
      ? buildKpi(
          labels.remaining,
          formatEUR(revMois - depMois),
          revPrev - depPrev !== 0
            ? ((revMois - depMois - (revPrev - depPrev)) / Math.abs(revPrev - depPrev)) * 100
            : null,
          { hint: labels.hint }
        )
      : buildKpi(labels.margin, `${marge.toFixed(1).replace(".", ",")} %`, revPrev > 0 ? marge - margePrev : null, { hint: labels.hint }),
  ];

  // Flux de trésorerie : par mois, 12 plus récents, ordre chronologique (hors virements).
  const parMois = new Map<string, { revenus: number; depenses: number }>();
  for (const t of spend) {
    const k = monthKey(t.date);
    const e = parMois.get(k) ?? { revenus: 0, depenses: 0 };
    if (t.type === "credit") e.revenus += Math.abs(t.amount);
    else e.depenses += Math.abs(t.amount);
    parMois.set(k, e);
  }
  const cashflow: CashflowPoint[] = Array.from(parMois.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([k, v]) => ({ mois: moisLabel(k, locale), revenus: v.revenus, depenses: v.depenses }));

  // Répartition des dépenses du mois de référence par catégorie (hors virements).
  const parCat = new Map<string, number>();
  for (const t of spend) {
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
    .select("category, amount")
    .eq("workspace_id", workspace.id);
  const budgets: BudgetRow[] = (budgetRows ?? []).map((b) => ({
    categorie: (b as { category: string }).category,
    budget: Number((b as { amount: number }).amount),
    depense: parCat.get((b as { category: string }).category) ?? 0,
  }));

  // 6 transactions les plus récentes (toutes, virements compris).
  const recent: RecentTransaction[] = txns.slice(0, 6).map((t) => ({
    id: t.id,
    merchant: t.merchant,
    dateLabel: formatDateFr(t.date),
    category: t.category,
    amount: t.amount,
    type: t.type,
  }));

  // Catégories de dépenses présentes (hors virements) → pour créer des budgets.
  const availableCategories = Array.from(
    new Set(spend.filter((t) => t.type === "debit").map((t) => t.category))
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
    accounts,
    selectedAccount: accountFilter,
    hasData: true,
  };
}
