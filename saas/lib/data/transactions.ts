import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/data/workspace";
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
  label: string;
  category: string;
  amount: number;
  direction: "debit" | "credit";
  status: string;
  account_id: string | null;
  accounts: { name: string } | null; // jointure pour le nom du compte
}

// Récupère les transactions de l'espace courant (RLS) + la liste des catégories
// réellement présentes (pour le filtre). Le nom du compte vient d'une jointure.
export async function getTransactions(): Promise<{
  transactions: TransactionRow[];
  categories: string[];
}> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return { transactions: [], categories: [] };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, date, label, category, amount, direction, status, account_id, accounts(name)"
    )
    .eq("workspace_id", workspace.id)
    .order("date", { ascending: false });

  if (error || !data) return { transactions: [], categories: [] };

  const transactions: TransactionRow[] = (data as unknown as DbRow[]).map((t) => ({
    id: t.id,
    date: t.date,
    dateLabel: formatDateFr(t.date),
    merchant: t.label,
    category: t.category,
    account: t.accounts?.name ?? null,
    amount: Number(t.amount),
    type: t.direction,
    status: t.status,
  }));

  const categories = Array.from(
    new Set(transactions.map((t) => t.category))
  ).sort((a, b) => a.localeCompare(b));

  return { transactions, categories };
}
