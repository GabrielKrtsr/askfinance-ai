import { getCurrentWorkspace } from "@/lib/data/workspace";
import { getGroupLedger } from "@/lib/data/group";
import { GroupLedger } from "@/components/dashboard/group-ledger";

// Page « Dépenses partagées » : registre type Tricount pour les espaces de groupe.
export default async function SharedPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  if (workspace.type !== "group") {
    return (
      <p className="text-sm text-muted-foreground">
        Les dépenses partagées ne concernent que les espaces de type groupe.
      </p>
    );
  }

  const ledger = await getGroupLedger(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dépenses partagées</h1>
        <p className="text-sm text-muted-foreground">
          Qui a payé quoi dans « {workspace.name} ».
        </p>
      </div>

      {ledger && <GroupLedger ledger={ledger} workspaceId={workspace.id} />}
    </div>
  );
}
