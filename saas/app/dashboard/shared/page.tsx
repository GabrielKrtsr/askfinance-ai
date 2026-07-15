import { getCurrentWorkspace } from "@/lib/data/workspace";
import { getGroupLedger } from "@/lib/data/group";
import { GroupLedger } from "@/components/dashboard/group-ledger";
import { getT } from "@/lib/i18n/server";

// Page « Dépenses partagées » : registre type Tricount pour les espaces de groupe.
export default async function SharedPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;
  const { t } = getT();

  if (workspace.type !== "group") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("pages.sharedUnavailable")}
      </p>
    );
  }

  const ledger = await getGroupLedger(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("pages.sharedTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.sharedSubtitle", { name: workspace.name })}
        </p>
      </div>

      {ledger && <GroupLedger ledger={ledger} workspaceId={workspace.id} />}
    </div>
  );
}
