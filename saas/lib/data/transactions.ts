import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { formatDateFr } from "@/lib/utils";

export const TRANSACTIONS_PAGE_SIZE = 50;

export type TransactionSort = "date" | "merchant" | "category" | "amount";
export type TransactionSortDirection = "asc" | "desc";

export interface TransactionFilters {
  page?: number;
  query?: string;
  category?: string;
  type?: "debit" | "credit";
  from?: string;
  to?: string;
  sort?: TransactionSort;
  direction?: TransactionSortDirection;
}

export interface TransactionRow {
  id: string;
  date: string;
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
  category: string | null;
  amount: number;
  direction: "debit" | "credit";
  status: string;
  accounts: { name: string } | null;
}

interface SummaryRow {
  total_in: number | string | null;
  total_out: number | string | null;
  net: number | string | null;
}

const SORT_COLUMNS: Record<TransactionSort, string> = {
  date: "date",
  merchant: "label",
  category: "category",
  amount: "amount",
};

function cleanDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<{
  transactions: TransactionRow[];
  categories: string[];
  total: number;
  page: number;
  pageCount: number;
  totalIn: number;
  totalOut: number;
  net: number;
}> {
  const empty = {
    transactions: [], categories: [], total: 0, page: 1, pageCount: 1,
    totalIn: 0, totalOut: 0, net: 0,
  };
  const workspace = await getCurrentWorkspace();
  if (!workspace) return empty;

  const supabase = createClient();
  const queryText = filters.query?.trim().slice(0, 100) || undefined;
  const category = filters.category?.trim().slice(0, 100) || undefined;
  const from = cleanDate(filters.from);
  const to = cleanDate(filters.to);
  const sort = filters.sort && filters.sort in SORT_COLUMNS ? filters.sort : "date";
  const direction = filters.direction === "asc" ? "asc" : "desc";
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));

  let query = supabase
    .from("transactions")
    .select(
      "id, date, label, category, amount, direction, status, accounts(name)",
      { count: "exact" }
    )
    .eq("workspace_id", workspace.id);

  if (queryText) query = query.ilike("label", `%${queryText}%`);
  if (category) query = query.eq("category", category);
  if (filters.type) query = query.eq("direction", filters.type);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const fromRow = (requestedPage - 1) * TRANSACTIONS_PAGE_SIZE;
  const [{ data, error, count }, categoriesResult, summaryResult] = await Promise.all([
    query
      .order(SORT_COLUMNS[sort], { ascending: direction === "asc" })
      .order("id", { ascending: direction === "asc" })
      .range(fromRow, fromRow + TRANSACTIONS_PAGE_SIZE - 1),
    supabase.rpc("transaction_categories", { p_workspace_id: workspace.id }),
    supabase.rpc("transaction_filter_summary", {
      p_workspace_id: workspace.id,
      p_search: queryText ?? null,
      p_category: category ?? null,
      p_direction: filters.type ?? null,
      p_from: from ?? null,
      p_to: to ?? null,
    }),
  ]);

  if (error) return empty;
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const summary = (summaryResult.data?.[0] ?? {}) as SummaryRow;

  return {
    transactions: ((data ?? []) as unknown as DbRow[]).map((t) => ({
      id: t.id,
      date: t.date,
      dateLabel: formatDateFr(t.date),
      merchant: t.label,
      category: t.category ?? "Non catégorisé",
      account: t.accounts?.name ?? null,
      amount: Number(t.amount),
      type: t.direction,
      status: t.status,
    })),
    categories: ((categoriesResult.data ?? []) as { category: string }[]).map(
      (row) => row.category
    ),
    total,
    page,
    pageCount,
    totalIn: Number(summary.total_in ?? 0),
    totalOut: Number(summary.total_out ?? 0),
    net: Number(summary.net ?? 0),
  };
}
