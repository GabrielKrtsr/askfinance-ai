import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { BudgetManager } from "@/components/dashboard/budget-manager";
import { MonthSelect } from "@/components/dashboard/month-select";
import { getT } from "@/lib/i18n/server";

// Page « Budget » (perso) : les enveloppes par catégorie + leur suivi.
export default async function BudgetPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;
  // Section propre au perso ; les autres types ne l'ont pas dans la nav.
  if (workspace.type !== "personal") redirect("/dashboard");

  const { t, locale } = getT();
  const data = await getDashboardData(
    searchParams.month,
    undefined,
    { t, locale },
    "personal"
  );
  const monthLabel = data.months.find(
    (option) => option.value === data.selectedMonth
  )?.label;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pages.budgetTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pages.budgetSubtitle")}
          </p>
        </div>
        {data.months.length > 0 && (
          <MonthSelect months={data.months} selected={data.selectedMonth} />
        )}
      </div>

      <BudgetManager
        budgets={data.budgets}
        categories={data.availableCategories}
        workspaceId={workspace.id}
        month={data.selectedMonth}
        monthLabel={monthLabel}
        canEdit={workspace.role !== "viewer"}
      />
    </div>
  );
}
