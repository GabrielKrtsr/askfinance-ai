import { createClient } from "@/lib/supabase/client";

export interface Account {
  id: string;
  name: string;
  type: string;
  opening_balance: number;
}

// Liste les comptes de l'utilisateur (RLS : ses comptes uniquement).
export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("accounts")
    .select("id, name, type, opening_balance")
    .order("created_at", { ascending: true });
  return (data ?? []) as Account[];
}

// Crée un compte pour l'utilisateur connecté.
export async function createAccount(
  name: string,
  openingBalance: number,
  type = "courant"
): Promise<Account | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      type,
      opening_balance: openingBalance,
    })
    .select("id, name, type, opening_balance")
    .single();

  if (error) return null;
  return data as Account;
}
