import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/data/dashboard";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { BudgetManager } from "@/components/dashboard/budget-manager";
import { getT } from "@/lib/i18n/server";

// Page « Budget » (perso) : les enveloppes par catégorie + leur suivi.
export default async function BudgetPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;
  // Section propre au perso ; les autres types ne l'ont pas dans la nav.
  if (workspace.type !== "personal") redirect("/dashboard");

  const { t, locale } = getT();
  const data = await getDashboardData(undefined, undefined, { t, locale }, "personal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">
          Vos enveloppes par catégorie et leur suivi sur le mois.
        </p>
      </div>

      <BudgetManager
        budgets={data.budgets}
        categories={data.availableCategories}
        workspaceId={workspace.id}
      />
    </div>
  );
}
