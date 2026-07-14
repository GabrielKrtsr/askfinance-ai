"use server";

import { randomInt } from "crypto";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WORKSPACE_COOKIE, type WorkspaceType } from "@/lib/data/workspace";
import { appendAuditEvent } from "@/lib/audit";

const YEAR = 60 * 60 * 24 * 365;

// Hiérarchie des rôles : on ne peut agir que sur un rôle STRICTEMENT inférieur
// au sien (un admin ne peut ni retirer un owner, ni promouvoir quelqu'un owner).
const ROLE_RANK: Record<string, number> = { owner: 3, admin: 2, member: 1, viewer: 0 };
const rank = (role: string) => ROLE_RANK[role] ?? 0;

// Code de jonction court, lisible (sans 0/O/1/I ambigus).
// randomInt (crypto) : Math.random est prédictible, inadapté à un secret.
function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

// Anti brute-force sur joinByCode : fenêtre glissante en mémoire, par utilisateur.
// Best-effort (réinitialisé au redéploiement) mais suffit à casser une énumération.
const JOIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const JOIN_ATTEMPT_MAX = 10;
const joinAttempts = new Map<string, number[]>();

function assertJoinRateLimit(userId: string) {
  const now = Date.now();
  const recent = (joinAttempts.get(userId) ?? []).filter(
    (t) => now - t < JOIN_ATTEMPT_WINDOW_MS
  );
  if (recent.length >= JOIN_ATTEMPT_MAX) {
    throw new Error("Trop de tentatives. Réessayez dans quelques minutes.");
  }
  recent.push(now);
  joinAttempts.set(userId, recent);
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");
  return user;
}

// Crée un espace + inscrit l'utilisateur courant comme owner actif, puis le sélectionne.
export async function createWorkspace(input: { type: WorkspaceType; name: string }) {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) throw new Error("Le nom de l'espace est requis.");

  const admin = createAdminClient();

  const { data: ws, error: wsError } = await admin
    .from("workspaces")
    .insert({
      type: input.type,
      name,
      // Espaces partageables (business, group) → code d'emblée ; perso solo = aucun.
      join_code: input.type === "personal" ? null : generateJoinCode(),
    })
    .select("id")
    .single();
  if (wsError || !ws) {
    throw new Error(wsError?.message ?? "Création de l'espace impossible.");
  }

  const { error: memberError } = await admin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });
  if (memberError) throw new Error(memberError.message);

  await admin.from("profiles").update({ default_workspace_id: ws.id }).eq("id", user.id);
  cookies().set(WORKSPACE_COOKIE, ws.id, { path: "/", maxAge: YEAR });

  return { id: ws.id };
}

// Rejoint un espace via son code → adhésion en attente (AUCUN droit tant que non validée).
export async function joinByCode(code: string) {
  const user = await requireUser();
  assertJoinRateLimit(user.id);
  const admin = createAdminClient();

  const { data: ws } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("join_code", code.trim().toUpperCase())
    .maybeSingle();
  if (!ws) throw new Error("Code invalide ou expiré.");

  const { data: existing } = await admin
    .from("workspace_members")
    .select("status")
    .eq("workspace_id", ws.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { workspaceName: ws.name as string, status: existing.status as string };
  }

  const { error } = await admin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: "member",
    status: "pending",
  });
  if (error) throw new Error(error.message);
  return { workspaceName: ws.name as string, status: "pending" };
}

// Bascule l'espace courant (après vérification de l'appartenance active).
export async function switchWorkspace(workspaceId: string) {
  const user = await requireUser();
  const supabase = createClient();

  const { data } = await supabase
    .from("workspace_members")
    .select("status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) throw new Error("Espace inaccessible.");

  cookies().set(WORKSPACE_COOKIE, workspaceId, { path: "/", maxAge: YEAR });
}

// Valide un membre en attente (réservé aux owner/admin ACTIFS de l'espace).
// Le rôle accordé doit être STRICTEMENT inférieur à celui de l'appelant :
// un admin ne peut donner que member/viewer, personne ne peut accorder owner ici.
export async function approveMember(input: {
  workspaceId: string;
  userId: string;
  role?: string;
}) {
  const caller = await requireUser();
  const admin = createAdminClient();

  const { data: callerMembership } = await admin
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", caller.id)
    .maybeSingle();
  if (
    !callerMembership ||
    callerMembership.status !== "active" ||
    !["owner", "admin"].includes(callerMembership.role)
  ) {
    throw new Error("Action réservée aux responsables de l'espace.");
  }

  const grantedRole = input.role ?? "member";
  if (
    !["admin", "member", "viewer"].includes(grantedRole) ||
    rank(grantedRole) >= rank(callerMembership.role)
  ) {
    throw new Error("Rôle non autorisé.");
  }

  const { error } = await admin
    .from("workspace_members")
    .update({ status: "active", role: grantedRole })
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, { workspaceId: input.workspaceId, actorId: caller.id, action: "member.approved", entityType: "member", entityId: input.userId, metadata: { role: grantedRole } });
}

// Retire un membre (ou refuse une demande). Réservé aux owner/admin actifs,
// et uniquement sur un rôle STRICTEMENT inférieur (un admin ne retire pas un owner).
export async function removeMember(input: { workspaceId: string; userId: string }) {
  const caller = await requireUser();
  const admin = createAdminClient();

  const { data: callerMembership } = await admin
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", caller.id)
    .maybeSingle();
  if (
    !callerMembership ||
    callerMembership.status !== "active" ||
    !["owner", "admin"].includes(callerMembership.role)
  ) {
    throw new Error("Action réservée aux responsables de l'espace.");
  }
  if (input.userId === caller.id) {
    throw new Error("Vous ne pouvez pas vous retirer vous-même.");
  }

  const { data: target } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!target) throw new Error("Membre introuvable.");
  if (rank(target.role) >= rank(callerMembership.role)) {
    throw new Error("Vous ne pouvez pas retirer un membre de rang égal ou supérieur.");
  }

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, { workspaceId: input.workspaceId, actorId: caller.id, action: "member.removed", entityType: "member", entityId: input.userId });
}

export async function changeMemberRole(input: { workspaceId: string; userId: string; role: "admin" | "member" | "viewer" }) {
  const caller = await requireUser();
  const admin = createAdminClient();
  const { data: callerMembership } = await admin.from("workspace_members").select("role, status").eq("workspace_id", input.workspaceId).eq("user_id", caller.id).maybeSingle();
  if (!callerMembership || callerMembership.status !== "active" || !["owner", "admin"].includes(callerMembership.role)) throw new Error("Action réservée aux responsables.");
  const { data: target } = await admin.from("workspace_members").select("role, status").eq("workspace_id", input.workspaceId).eq("user_id", input.userId).maybeSingle();
  if (!target || target.status !== "active") throw new Error("Membre introuvable.");
  if (rank(target.role) >= rank(callerMembership.role) || rank(input.role) >= rank(callerMembership.role)) throw new Error("Rôle non autorisé.");
  const { error } = await admin.from("workspace_members").update({ role: input.role }).eq("workspace_id", input.workspaceId).eq("user_id", input.userId);
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, { workspaceId: input.workspaceId, actorId: caller.id, action: "member.role_changed", entityType: "member", entityId: input.userId, metadata: { from: target.role, to: input.role } });
}

// Quitte un espace (retire sa propre adhésion). Interdit au dernier propriétaire :
// il doit d'abord supprimer l'espace (ou, plus tard, transférer la propriété).
export async function leaveWorkspace(workspaceId: string) {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("workspace_members")
    .select("user_id, role, status")
    .eq("workspace_id", workspaceId);
  const members = (rows ?? []) as { user_id: string; role: string; status: string }[];

  const me = members.find((m) => m.user_id === user.id);
  if (!me) throw new Error("Vous n'êtes pas membre de cet espace.");

  const activeOwners = members.filter((m) => m.role === "owner" && m.status === "active");
  if (me.role === "owner" && activeOwners.length <= 1) {
    throw new Error(
      "Vous êtes le seul propriétaire : supprimez l'espace pour le quitter."
    );
  }

  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  cookies().delete(WORKSPACE_COOKIE);
}

// Supprime un espace ET toutes ses données (cascade SQL). Propriétaire uniquement.
export async function deleteWorkspace(workspaceId: string) {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: me } = await admin
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "active" || me.role !== "owner") {
    throw new Error("Seul le propriétaire peut supprimer l'espace.");
  }

  const { error } = await admin.from("workspaces").delete().eq("id", workspaceId);
  if (error) throw new Error(error.message);

  cookies().delete(WORKSPACE_COOKIE);
}
