import { getCurrentWorkspace, getWorkspaceMembers } from "@/lib/data/workspace";
import { MembersPanel } from "@/components/dashboard/members-panel";
import { WorkflowCenter } from "@/components/dashboard/workflow-center";
import { getWorkflowCenter } from "@/lib/data/workflows";
import { getT } from "@/lib/i18n/server";

// Page « Membres » : code d'invitation + liste + validation des demandes.
export default async function MembersPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null; // le gate du layout redirige déjà si besoin

  const view = await getWorkspaceMembers(workspace.id);
  const workflowCenter = await getWorkflowCenter(workspace.id);
  const { t } = getT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("pages.membersTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.membersSubtitle", { name: workspace.name })}
        </p>
      </div>

      {view ? (
        <MembersPanel view={view} workspaceId={workspace.id} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("pages.membersUnavailable")}</p>
      )}
      {workflowCenter ? <WorkflowCenter workspaceId={workspace.id} workflows={workflowCenter.workflows} audit={workflowCenter.audit} role={workflowCenter.role} /> : null}
    </div>
  );
}
