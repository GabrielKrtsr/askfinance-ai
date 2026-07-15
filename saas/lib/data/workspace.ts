import { cache } from "react";
import { cookies } from "next/headers";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authUserDisplayName,
  memberIdentifierFallback,
} from "@/lib/data/user-name";

export type WorkspaceType = "personal" | "business" | "group";
export type OnboardingStatus = "pending" | "completed" | "skipped";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  role: string;
  status: string;
  onboardingStatus: OnboardingStatus;
}

// Cookie qui mémorise l'espace courant (même logique que `locale`).
export const WORKSPACE_COOKIE = "af_workspace";

interface MemberRow {
  role: string;
  status: string;
  workspaces: {
    id: string;
    name: string;
    type: WorkspaceType;
    onboarding_status: OnboardingStatus;
  };
}

// Espaces dont l'utilisateur est membre ACTIF (RLS : ses propres adhésions).
export const getWorkspaces = cache(async (): Promise<Workspace[]> => {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("role, status, workspaces!inner(id, name, type, onboarding_status)")
    .eq("user_id", user.id)
    .eq("status", "active");

  return ((data ?? []) as unknown as MemberRow[]).map((row) => ({
    id: row.workspaces.id,
    name: row.workspaces.name,
    type: row.workspaces.type,
    role: row.role,
    status: row.status,
    onboardingStatus: row.workspaces.onboarding_status,
  }));
});

// Espace courant : cookie → défaut du profil → premier espace. null si aucun.
export const getCurrentWorkspace = cache(async (): Promise<Workspace | null> => {
  const all = await getWorkspaces();
  if (all.length === 0) return null;

  const cookieId = cookies().get(WORKSPACE_COOKIE)?.value;
  const fromCookie = cookieId ? all.find((w) => w.id === cookieId) : undefined;
  if (fromCookie) return fromCookie;

  // Repli : default_workspace_id du profil.
  const user = await getAuthUser();
  if (user) {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_workspace_id")
      .eq("id", user.id)
      .single();
    const def = profile?.default_workspace_id
      ? all.find((w) => w.id === profile.default_workspace_id)
      : undefined;
    if (def) return def;
  }

  return all[0];
});

// ---------- Membres d'un espace ----------

export interface WorkspaceMember {
  userId: string;
  name: string;
  role: string;
  status: string;
}

export interface MembersView {
  members: WorkspaceMember[];
  joinCode: string | null;
  callerRole: string | null;
  currentUserId: string;
}

// Membres d'un espace + code de jonction. Utilise le client admin (service-role)
// pour lire les profils des autres membres (la RLS `profiles` ne montre que le sien),
// MAIS ne renvoie rien si l'appelant n'est pas lui-même membre actif (garde manuelle).
export async function getWorkspaceMembers(
  workspaceId: string
): Promise<MembersView | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: memberRows } = await admin
    .from("workspace_members")
    .select("user_id, role, status")
    .eq("workspace_id", workspaceId);
  const rows = (memberRows ?? []) as { user_id: string; role: string; status: string }[];

  const caller = rows.find((r) => r.user_id === user.id && r.status === "active");
  if (!caller) return null; // pas membre actif → pas d'accès

  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", rows.map((r) => r.user_id));
  const nameById = new Map(
    ((profileRows ?? []) as { id: string; first_name: string | null; last_name: string | null }[]).map(
      (p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ")]
    )
  );
  const missingNameIds = rows
    .map((row) => row.user_id)
    .filter((id) => !nameById.get(id));
  await Promise.all(
    missingNameIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const authName = authUserDisplayName(data.user);
      if (authName) nameById.set(id, authName);
    })
  );

  const { data: ws } = await admin
    .from("workspaces")
    .select("join_code")
    .eq("id", workspaceId)
    .single();

  const members: WorkspaceMember[] = rows.map((r) => ({
    userId: r.user_id,
    name: nameById.get(r.user_id) || memberIdentifierFallback(r.user_id),
    role: r.role,
    status: r.status,
  }));
  // Tri : owner d'abord, puis membres actifs, puis demandes en attente.
  const rank = (m: WorkspaceMember) =>
    m.status === "pending" ? 2 : m.role === "owner" ? 0 : 1;
  members.sort((a, b) => rank(a) - rank(b));

  return {
    members,
    joinCode: (ws?.join_code as string | null) ?? null,
    callerRole: caller.role,
    currentUserId: user.id,
  };
}
