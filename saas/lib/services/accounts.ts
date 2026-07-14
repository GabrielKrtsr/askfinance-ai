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

export interface AccountBalanceDetails {
  id: string;
  name: string;
  currentBalance: number;
}

const ACCOUNT_TRANSACTION_PAGE_SIZE = 1_000;

async function requireAccountEditor() {
  const [workspace, user] = await Promise.all([getCurrentWorkspace(), getAuthUser()]);
  if (!workspace || !user) throw new Error("Non authentifié.");
  if (workspace.role === "viewer") {
    throw new Error("Vous avez un accès en lecture seule.");
  }
  return { workspace, user, admin: createAdminClient() };
}

async function getAccountTransactionTotal(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  accountId: string
) {
  let total = 0;
  for (let offset = 0; ; offset += ACCOUNT_TRANSACTION_PAGE_SIZE) {
    const { data, error } = await admin
      .from("transactions")
      .select("amount")
      .eq("workspace_id", workspaceId)
      .eq("account_id", accountId)
      .order("id", { ascending: true })
      .range(offset, offset + ACCOUNT_TRANSACTION_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { amount: number | string }[];
    total += rows.reduce((sum, row) => sum + Number(row.amount), 0);
    if (rows.length < ACCOUNT_TRANSACTION_PAGE_SIZE) break;
  }
  return Math.round(total * 100) / 100;
}

export async function getAccountBalanceDetails(
  accountId: string
): Promise<AccountBalanceDetails> {
  const { workspace, admin } = await requireAccountEditor();
  const { data: account } = await admin
    .from("accounts")
    .select("id, name, opening_balance")
    .eq("id", accountId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!account) throw new Error("Compte introuvable.");

  const transactionTotal = await getAccountTransactionTotal(admin, workspace.id, accountId);
  return {
    id: account.id as string,
    name: account.name as string,
    currentBalance:
      Math.round((Number(account.opening_balance) + transactionTotal) * 100) / 100,
  };
}

// Ajuste le solde réellement constaté aujourd'hui. Les transactions restent
// intactes : seul le point de départ est recalculé pour obtenir le solde demandé.
export async function updateAccountCurrentBalance(
  accountId: string,
  requestedBalance: number
) {
  if (!Number.isFinite(requestedBalance) || Math.abs(requestedBalance) > 999_999_999_999) {
    throw new Error("Le solde saisi n'est pas valide.");
  }

  const { workspace, user, admin } = await requireAccountEditor();
  const { data: account } = await admin
    .from("accounts")
    .select("id, name, opening_balance")
    .eq("id", accountId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!account) throw new Error("Compte introuvable.");

  const transactionTotal = await getAccountTransactionTotal(admin, workspace.id, accountId);
  const previousOpening = Number(account.opening_balance);
  const previousBalance = Math.round((previousOpening + transactionTotal) * 100) / 100;
  const nextBalance = Math.round(requestedBalance * 100) / 100;
  const nextOpening = Math.round((nextBalance - transactionTotal) * 100) / 100;

  const { error } = await admin
    .from("accounts")
    .update({ opening_balance: nextOpening.toFixed(2) })
    .eq("id", accountId)
    .eq("workspace_id", workspace.id);
  if (error) throw new Error(error.message);

  await appendAuditEvent(admin, {
    workspaceId: workspace.id,
    actorId: user.id,
    action: "account.balance_adjusted",
    entityType: "account",
    entityId: accountId,
    metadata: {
      name: account.name,
      previousBalance,
      nextBalance,
      previousOpening,
      nextOpening,
    },
  });

  return { currentBalance: nextBalance };
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
