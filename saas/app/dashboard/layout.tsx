import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getProfile } from "@/lib/data/dashboard";
import { getCurrentWorkspace, getWorkspaces } from "@/lib/data/workspace";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Les trois lectures sont indépendantes → en parallèle. `getAuthUser` et
  // `getWorkspaces` sont mémoïsés par requête : pas d'appel réseau dupliqué.
  const [profile, workspace, workspaces] = await Promise.all([
    getProfile(),
    getCurrentWorkspace(),
    getWorkspaces(),
  ]);

  // Pas connecté → on renvoie vers la page de connexion.
  if (!profile) redirect("/login");

  // Aucun espace actif → onboarding (choix perso/pro, créer/rejoindre).
  if (!workspace) redirect("/onboarding");

  const locale = getLocale();
  const messages = getDictionary(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <DashboardShell
        user={{
          fullName: profile.fullName,
          initials: profile.initials,
          email: profile.email,
        }}
        workspace={{ id: workspace.id, name: workspace.name, type: workspace.type }}
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, type: w.type }))}
      >
        {children}
      </DashboardShell>
    </I18nProvider>
  );
}
