"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/data/workspace";

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
