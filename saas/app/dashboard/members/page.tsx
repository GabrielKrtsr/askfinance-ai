import { getCurrentWorkspace, getWorkspaceMembers } from "@/lib/data/workspace";
import { MembersPanel } from "@/components/dashboard/members-panel";

// Page « Membres » : code d'invitation + liste + validation des demandes.
export default async function MembersPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null; // le gate du layout redirige déjà si besoin

  const view = await getWorkspaceMembers(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Membres</h1>
        <p className="text-sm text-muted-foreground">
          Gérez qui a accès à « {workspace.name} ».
        </p>
      </div>

      {view ? (
        <MembersPanel view={view} workspaceId={workspace.id} />
      ) : (
        <p className="text-sm text-muted-foreground">Accès indisponible.</p>
      )}
    </div>
  );
}
