import { getProfile } from "@/lib/data/dashboard";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { getT } from "@/lib/i18n/server";

// Page « Réglages » : thème, langue, profil et session.
export default async function SettingsPage() {
  const profile = await getProfile();
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
    </div>
  );
}
