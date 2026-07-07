import { redirect } from "next/navigation";

import { getTransactions } from "@/lib/data/transactions";
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

export default async function TransactionsPage() {
  const workspace = await getCurrentWorkspace();
  if (workspace?.type === "group") redirect("/dashboard/shared");
  const isPerso = workspace?.type === "personal";

  const { t, locale } = getT();
  const { transactions, categories } = await getTransactions();
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
          {isPerso ? "DÃ©penses" : t("pages.transactionsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isPerso
            ? "Vos dÃ©penses, par catÃ©gorie et en dÃ©tail."
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
        transactions={transactions}
        categories={categories}
        groups={groups}
      />
    </div>
  );
}
