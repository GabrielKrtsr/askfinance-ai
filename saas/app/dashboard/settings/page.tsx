import { getProfile } from "@/lib/data/dashboard";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { WorkspaceSettings } from "@/components/dashboard/workspace-settings";
import { getT } from "@/lib/i18n/server";

// Page « Réglages » : thème, langue, profil, session, espace de travail.
export default async function SettingsPage() {
  const profile = await getProfile();
  const workspace = await getCurrentWorkspace();
  const { t } = getT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pages.settingsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("pages.settingsSubtitle")}
        </p>
      </div>

      <SettingsPanel
        user={{
          fullName: profile?.fullName ?? "",
          email: profile?.email ?? "",
        }}
      />

      {workspace && (
        <WorkspaceSettings
          workspace={{
            id: workspace.id,
            name: workspace.name,
            role: workspace.role,
          }}
        />
      )}
    </div>
  );
}
