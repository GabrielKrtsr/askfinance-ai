"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/audit";

export interface Account {
  id: string;
  name: string;
  type: string;
  opening_balance: number;
}

// Liste les comptes de l'espace courant (RLS : membre actif).
export async function getAccounts(): Promise<Account[]> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("accounts")
    .select("id, name, type, opening_balance")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });
  return (data ?? []) as Account[];
}

// Crée un compte dans l'espace courant (RLS : la policy `accounts_members`
// autorise l'écriture car l'utilisateur en est membre actif).
export async function createAccount(
  name: string,
  openingBalance: number,
  type = "checking"
): Promise<Account | null> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      workspace_id: workspace.id,
      name,
      type,
      opening_balance: openingBalance,
    })
    .select("id, name, type, opening_balance")
    .single();

  if (error) return null;
  return data as Account;
}

export interface AccountDeletionImpact {
  id: string;
  name: string;
  transactions: number;
  imports: number;
}

async function requireAccountManager() {
  const [workspace, user] = await Promise.all([getCurrentWorkspace(), getAuthUser()]);
  if (!workspace || !user) throw new Error("Non authentifié.");
  if (!['owner', 'admin'].includes(workspace.role)) {
    throw new Error("La suppression d’un compte est réservée aux responsables de l’espace.");
  }
  return { workspace, user, admin: createAdminClient() };
}

export async function getAccountDeletionImpact(accountId: string): Promise<AccountDeletionImpact> {
  const { workspace, admin } = await requireAccountManager();
  const { data: account } = await admin.from("accounts").select("id, name").eq("id", accountId).eq("workspace_id", workspace.id).maybeSingle();
  if (!account) throw new Error("Compte introuvable.");
  const [{ count: transactions }, { count: imports }] = await Promise.all([
    admin.from("transactions").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("account_id", accountId),
    admin.from("imports").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("account_id", accountId),
  ]);
  return { id: account.id, name: account.name, transactions: transactions ?? 0, imports: imports ?? 0 };
}

export async function deleteAccount(accountId: string, confirmationName: string) {
  const { workspace, user, admin } = await requireAccountManager();
  const impact = await getAccountDeletionImpact(accountId);
  if (confirmationName.trim() !== impact.name) {
    throw new Error("Le nom saisi ne correspond pas au compte.");
  }
  const { error } = await admin.from("accounts").delete().eq("id", accountId).eq("workspace_id", workspace.id);
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, {
    workspaceId: workspace.id,
    actorId: user.id,
    action: "account.deleted",
    entityType: "account",
    entityId: accountId,
    metadata: { name: impact.name, transactions: impact.transactions, imports: impact.imports },
  });
  return impact;
}
