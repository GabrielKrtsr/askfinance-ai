import { redirect } from "next/navigation";

import { TaxVault } from "@/components/dashboard/tax-vault";
import { EInvoiceReadiness } from "@/components/dashboard/einvoice-readiness";
import { CompanyProfile } from "@/components/dashboard/company-profile";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { getT } from "@/lib/i18n/server";

// Page « Coffre-fort & Réforme 2026 » : provisions fiscales + facture électronique.
export default async function FiscalPage() {
  const workspace = await getCurrentWorkspace();
  // Section réservée aux espaces entreprise.
  if (workspace && workspace.type !== "business") redirect("/dashboard");
  const workspaceId = workspace?.id ?? "";
  const { t } = getT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pages.fiscalTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.fiscalSubtitle")}
        </p>
      </div>

      <CompanyProfile workspaceId={workspaceId} />
      <TaxVault workspaceId={workspaceId} />
      <EInvoiceReadiness workspaceId={workspaceId} />
    </div>
  );
}
