import { redirect } from "next/navigation";

import {
  getTransactions,
  type TransactionFilters,
  type TransactionSort,
} from "@/lib/data/transactions";
import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentWorkspace, getWorkspaces } from "@/lib/data/workspace";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-center text-sm text-muted-foreground">
      <p>{children}</p>
    </div>
  );
}

interface TransactionsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransactionsPage({ searchParams = {} }: TransactionsPageProps) {
  const workspace = await getCurrentWorkspace();
  if (workspace?.type === "group") redirect("/dashboard/shared");
  const isPerso = workspace?.type === "personal";

  const { t, locale } = getT();
  const rawSort = one(searchParams.sort);
  const filters: TransactionFilters = {
    page: Number(one(searchParams.page)) || 1,
    query: one(searchParams.q),
    category: one(searchParams.category),
    type: ["debit", "credit"].includes(one(searchParams.type) ?? "")
      ? (one(searchParams.type) as "debit" | "credit")
      : undefined,
    from: one(searchParams.from),
    to: one(searchParams.to),
    sort: ["date", "merchant", "category", "amount"].includes(rawSort ?? "")
      ? (rawSort as TransactionSort)
      : "date",
    direction: one(searchParams.dir) === "asc" ? "asc" : "desc",
  };
  const transactionData = await getTransactions(filters);
  const groups = (await getWorkspaces())
    .filter((w) => w.type === "group")
    .map((w) => ({ id: w.id, name: w.name }));
  const dashboardData = await getDashboardData(
    undefined,
    undefined,
    { t, locale },
    workspace?.type ?? "business"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isPerso ? "Dépenses" : t("pages.transactionsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isPerso
            ? "Vos dépenses, par catégorie et en détail."
            : t("pages.transactionsSubtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("dashboard.cashflowTitle")}</CardTitle>
            <CardDescription>{t("dashboard.cashflowDesc")}</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              {t("dashboard.revenue")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal" />
              {t("dashboard.expenses")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData.cashflow.length > 0 ? (
            <CashflowChart data={dashboardData.cashflow} />
          ) : (
            <EmptyState>{t("dashboard.noFlow")}</EmptyState>
          )}
        </CardContent>
      </Card>

      <TransactionsTable
        transactions={transactionData.transactions}
        categories={transactionData.categories}
        filters={filters}
        total={transactionData.total}
        page={transactionData.page}
        pageCount={transactionData.pageCount}
        totalIn={transactionData.totalIn}
        totalOut={transactionData.totalOut}
        net={transactionData.net}
        groups={groups}
      />
    </div>
  );
}
