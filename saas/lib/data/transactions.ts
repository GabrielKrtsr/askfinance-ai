import { createClient } from "@/lib/supabase/server";
import { formatDateFr } from "@/lib/utils";

export interface TransactionRow {
  id: string;
  date: string; // ISO "AAAA-MM-JJ" (pour le filtre par intervalle)
  dateLabel: string;
  merchant: string;
  category: string;
  account: string | null;
  amount: number;
  type: "debit" | "credit";
  status: string;
}

interface DbRow {
  id: string;
  date: string;
  merchant: string;
  category: string;
  account: string | null;
  amount: number;
  type: "debit" | "credit";
  status: string;
}

// Récupère toutes les transactions de l'utilisateur connecté (RLS) + la
// liste des catégories réellement présentes (pour le filtre).
export async function getTransactions(): Promise<{
  transactions: TransactionRow[];
  categories: string[];
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, merchant, category, account, amount, type, status")
    .order("date", { ascending: false });

  if (error || !data) return { transactions: [], categories: [] };

  const transactions: TransactionRow[] = (data as DbRow[]).map((t) => ({
    id: t.id,
    date: t.date,
    dateLabel: formatDateFr(t.date),
    merchant: t.merchant,
    category: t.category,
    account: t.account,
    amount: Number(t.amount),
    type: t.type,
    status: t.status,
  }));

  const categories = Array.from(
    new Set(transactions.map((t) => t.category))
  ).sort((a, b) => a.localeCompare(b));

  return { transactions, categories };
}
