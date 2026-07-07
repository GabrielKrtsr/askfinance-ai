import { cache } from "react";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceType = "personal" | "business" | "group";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  role: string;
  status: string;
}

// Cookie qui mémorise l'espace courant (même logique que `locale`).
export const WORKSPACE_COOKIE = "af_workspace";

interface MemberRow {
  role: string;
  status: string;
  workspaces: { id: string; name: string; type: WorkspaceType };
}

function firstNonEmpty(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function currentUserDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const fullMeta =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : "";
  const [metaFirst, ...metaRest] = fullMeta.split(" ");
  const firstName = firstNonEmpty(
    typeof meta.first_name === "string" ? meta.first_name : null,
    typeof meta.given_name === "string" ? meta.given_name : null,
    metaFirst
  );
  const lastName = firstNonEmpty(
    typeof meta.last_name === "string" ? meta.last_name : null,
    typeof meta.family_name === "string" ? meta.family_name : null,
    metaRest.join(" ")
  );

  return [firstName, lastName].filter(Boolean).join(" ") || user.email || "Vous";
}

// Espaces dont l'utilisateur est membre ACTIF (RLS : ses propres adhésions).
export const getWorkspaces = cache(async (): Promise<Workspace[]> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workspace_members")
    .select("role, status, workspaces!inner(id, name, type)")
    .eq("user_id", user.id)
    .eq("status", "active");

  return ((data ?? []) as unknown as MemberRow[]).map((row) => ({
    id: row.workspaces.id,
    name: row.workspaces.name,
    type: row.workspaces.type,
    role: row.role,
    status: row.status,
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  nameById.set(user.id, nameById.get(user.id) || currentUserDisplayName(user));

  const { data: ws } = await admin
    .from("workspaces")
    .select("join_code")
    .eq("id", workspaceId)
    .single();

  const members: WorkspaceMember[] = rows.map((r) => ({
    userId: r.user_id,
    name: nameById.get(r.user_id) || (r.user_id === user.id ? "Vous" : "Utilisateur"),
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
