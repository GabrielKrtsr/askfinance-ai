import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getProfile } from "@/lib/data/dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  // Pas connecté → on renvoie vers la page de connexion.
  if (!profile) redirect("/login");

  return (
    <DashboardShell
      user={{
        fullName: profile.fullName,
        initials: profile.initials,
        email: profile.email,
      }}
    >
      {children}
    </DashboardShell>
  );
}
