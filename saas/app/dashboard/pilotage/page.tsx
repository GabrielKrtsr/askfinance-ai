import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { getT } from "@/lib/i18n/server";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { ReceivablesRadar } from "@/components/dashboard/receivables-radar";
import { RecurringCharges } from "@/components/dashboard/recurring-charges";
import { BudgetManager } from "@/components/dashboard/budget-manager";
import { PilotageProvider } from "@/components/dashboard/pilotage-provider";
import { FinancialInbox } from "@/components/dashboard/financial-inbox";
import { MonthSelect } from "@/components/dashboard/month-select";

// Perso : « Prévisions » (solde projeté + charges à venir).
// Pro : « Pilotage & Prévisions » (prévision + encaissements + charges + budget).
export default async function PilotagePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const workspace = await getCurrentWorkspace();
  if (workspace?.type === "group") redirect("/dashboard/shared");
  const workspaceId = workspace?.id ?? "";
  const { t, locale } = getT();

  if (workspace?.type === "personal") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prévisions</h1>
          <p className="text-sm text-muted-foreground">
            Anticipez votre solde et vos charges à venir.
          </p>
        </div>

        {/* Un seul appel API pour tous les widgets de la page. */}
        <PilotageProvider workspaceId={workspaceId}>
          <FinancialInbox workspaceId={workspaceId} />
          {/* Prévision de solde + alerte découvert */}
          <ForecastChart workspaceId={workspaceId} />

          {/* Charges récurrentes (abonnements, loyers…) */}
          <RecurringCharges workspaceId={workspaceId} />
        </PilotageProvider>
      </div>
    );
  }

  // Pro : pilotage complet.
  const data = await getDashboardData(
    searchParams.month,
    undefined,
    { t, locale },
    "business"
  );
  const monthLabel = data.months.find(
    (option) => option.value === data.selectedMonth
  )?.label;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("pages.pilotageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("pages.pilotageSubtitle")}
          </p>
        </div>
        {data.months.length > 0 && (
          <MonthSelect months={data.months} selected={data.selectedMonth} />
        )}
      </div>

      {/* Un seul appel API pour tous les widgets de la page. */}
      <PilotageProvider workspaceId={workspaceId}>
        <FinancialInbox workspaceId={workspaceId} budgets={data.budgets} />
        {/* Prévision de trésorerie 90 jours + alerte découvert */}
        <ForecastChart workspaceId={workspaceId} />

        {/* Récupérer le cash + maîtriser les charges */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ReceivablesRadar workspaceId={workspaceId} />
          <RecurringCharges workspaceId={workspaceId} />
        </div>
      </PilotageProvider>

      {/* Suivi budgétaire */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BudgetManager
          budgets={data.budgets}
          categories={data.availableCategories}
          workspaceId={workspaceId}
          month={data.selectedMonth}
          monthLabel={monthLabel}
          canEdit={workspace?.role !== "viewer"}
        />
      </div>
    </div>
  );
}
