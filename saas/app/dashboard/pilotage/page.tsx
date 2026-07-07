import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { getT } from "@/lib/i18n/server";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { ReceivablesRadar } from "@/components/dashboard/receivables-radar";
import { RecurringCharges } from "@/components/dashboard/recurring-charges";
import { BudgetManager } from "@/components/dashboard/budget-manager";

// Perso : « Prévisions » (solde projeté + charges à venir).
// Pro : « Pilotage & Prévisions » (prévision + encaissements + charges + budget).
export default async function PilotagePage() {
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

        {/* Prévision de solde + alerte découvert */}
        <ForecastChart workspaceId={workspaceId} />

        {/* Charges récurrentes (abonnements, loyers…) */}
        <RecurringCharges workspaceId={workspaceId} />
      </div>
    );
  }

  // Pro : pilotage complet.
  const data = await getDashboardData(undefined, undefined, { t, locale }, "business");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pages.pilotageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.pilotageSubtitle")}
        </p>
      </div>

      {/* Prévision de trésorerie 90 jours + alerte découvert */}
      <ForecastChart workspaceId={workspaceId} />

      {/* Récupérer le cash + maîtriser les charges */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ReceivablesRadar workspaceId={workspaceId} />
        <RecurringCharges workspaceId={workspaceId} />
      </div>

      {/* Suivi budgétaire */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BudgetManager
          budgets={data.budgets}
          categories={data.availableCategories}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
}
