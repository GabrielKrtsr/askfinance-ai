"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Garde commune : exige un utilisateur connecté + membre ACTIF de l'espace.
// Renvoie l'utilisateur + un client admin (service-role) réutilisable.
async function requireActiveMember(workspaceId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("workspace_members")
    .select("status, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) throw new Error("Accès refusé à cet espace.");
  if (data.role === "viewer") {
    throw new Error("Cet espace est en lecture seule pour vous.");
  }

  return { user, admin };
}

async function activeMemberIds(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string
): Promise<string[]> {
  const { data } = await admin
    .from("workspace_members")
    .select("user_id, status")
    .eq("workspace_id", workspaceId);
  return ((data ?? []) as { user_id: string; status: string }[])
    .filter((m) => m.status === "active")
    .map((m) => m.user_id);
}

// Répartition égale d'un montant entre N membres (le dernier absorbe l'arrondi).
function equalShares(
  amount: number,
  ids: string[]
): { userId: string; amount: number }[] {
  const n = ids.length;
  const base = Math.floor((amount / n) * 100) / 100;
  return ids.map((id, idx) => ({
    userId: id,
    amount: idx === n - 1 ? round2(amount - base * (n - 1)) : base,
  }));
}

export async function addSharedExpense(input: {
  workspaceId: string;
  label: string;
  amount: number;
  date: string;
  category?: string;
  paidBy: string;
  splitType: "equal" | "custom";
  shares?: { userId: string; amount: number }[];
}) {
  const { admin } = await requireActiveMember(input.workspaceId);

  const label = input.label.trim();
  const amount = round2(input.amount);
  if (!label) throw new Error("Libellé requis.");
  if (!(amount > 0)) throw new Error("Montant invalide.");

  const ids = await activeMemberIds(admin, input.workspaceId);
  if (!ids.includes(input.paidBy)) throw new Error("Le payeur doit être membre du groupe.");

  let shares: { userId: string; amount: number }[];
  if (input.splitType === "custom" && input.shares?.length) {
    shares = input.shares.filter((s) => ids.includes(s.userId) && s.amount > 0);
    const sum = round2(shares.reduce((a, s) => a + s.amount, 0));
    if (Math.abs(sum - amount) > 0.01) {
      throw new Error("La somme des parts doit égaler le montant total.");
    }
  } else {
    shares = equalShares(amount, ids);
  }

  const { data: exp, error } = await admin
    .from("shared_expenses")
    .insert({
      workspace_id: input.workspaceId,
      paid_by: input.paidBy,
      date: input.date,
      label,
      amount,
      category: input.category?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !exp) throw new Error(error?.message ?? "Création de la dépense impossible.");

  const { error: shErr } = await admin.from("shared_expense_shares").insert(
    shares.map((s) => ({ expense_id: exp.id, user_id: s.userId, share_amount: s.amount }))
  );
  if (shErr) throw new Error(shErr.message);
}

export async function deleteSharedExpense(expenseId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const admin = createAdminClient();
  const { data: exp } = await admin
    .from("shared_expenses")
    .select("workspace_id")
    .eq("id", expenseId)
    .maybeSingle();
  if (!exp) throw new Error("Dépense introuvable.");

  await requireActiveMember(exp.workspace_id as string);

  const { error } = await admin.from("shared_expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message); // les parts partent en cascade
}

export async function addSettlement(input: {
  workspaceId: string;
  fromUser: string;
  toUser: string;
  amount: number;
}) {
  const { user, admin } = await requireActiveMember(input.workspaceId);
  const amount = round2(input.amount);
  if (!(amount > 0)) throw new Error("Montant invalide.");
  if (input.fromUser === input.toUser) {
    throw new Error("Le payeur et le bénéficiaire doivent être différents.");
  }
  // On ne peut déclarer qu'un règlement qui NOUS concerne, entre membres du groupe :
  // sinon n'importe quel membre pourrait fausser les soldes des autres.
  if (user.id !== input.fromUser && user.id !== input.toUser) {
    throw new Error("Vous devez être le payeur ou le bénéficiaire du règlement.");
  }
  const ids = await activeMemberIds(admin, input.workspaceId);
  if (!ids.includes(input.fromUser) || !ids.includes(input.toUser)) {
    throw new Error("Le payeur et le bénéficiaire doivent être membres du groupe.");
  }

  const { error } = await admin.from("settlements").insert({
    workspace_id: input.workspaceId,
    from_user: input.fromUser,
    to_user: input.toUser,
    amount,
  });
  if (error) throw new Error(error.message);
}

export async function updateSettlementStatus(input: {
  settlementId: string;
  status: "confirmed" | "disputed";
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const admin = createAdminClient();
  const { data: settlement } = await admin
    .from("settlements")
    .select("workspace_id, from_user, to_user, status")
    .eq("id", input.settlementId)
    .maybeSingle();
  if (!settlement) throw new Error("Règlement introuvable.");

  await requireActiveMember(settlement.workspace_id as string);

  const involved =
    settlement.from_user === user.id || settlement.to_user === user.id;
  if (!involved) {
    throw new Error("Seuls les membres concernés peuvent modifier ce règlement.");
  }
  // Confirmer = attester avoir REÇU l'argent : réservé au bénéficiaire
  // (le payeur ne peut pas confirmer son propre paiement à sa place).
  if (input.status === "confirmed" && settlement.to_user !== user.id) {
    throw new Error("Seul le bénéficiaire peut confirmer la réception.");
  }
  if (settlement.status === "confirmed") {
    throw new Error("Un règlement confirmé ne peut plus être modifié.");
  }

  const { error } = await admin
    .from("settlements")
    .update({ status: input.status })
    .eq("id", input.settlementId);
  if (error) throw new Error(error.message);
}

// Passerelle : pousse une transaction perso vers un groupe en tant que dépense
// partagée (répartition égale, payée par l'utilisateur courant).
export async function shareTransactionToGroup(input: {
  transactionId: string;
  workspaceId: string;
}) {
  const { user, admin } = await requireActiveMember(input.workspaceId);

  const { data: tx } = await admin
    .from("transactions")
    .select("workspace_id, label, amount, date, category")
    .eq("id", input.transactionId)
    .maybeSingle();
  if (!tx) throw new Error("Transaction introuvable.");

  // L'utilisateur doit être membre de l'espace SOURCE de la transaction.
  const { data: srcMember } = await admin
    .from("workspace_members")
    .select("status")
    .eq("workspace_id", tx.workspace_id as string)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!srcMember) throw new Error("Accès refusé à cette transaction.");

  const amount = round2(Math.abs(Number(tx.amount)));
  if (!(amount > 0)) throw new Error("Montant invalide.");

  // Anti-doublon : une transaction ne peut être poussée qu'une fois vers un groupe.
  const { data: already } = await admin
    .from("shared_expenses")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("source_transaction_id", input.transactionId)
    .maybeSingle();
  if (already) throw new Error("Cette transaction a déjà été partagée dans ce groupe.");

  const ids = await activeMemberIds(admin, input.workspaceId);
  const shares = equalShares(amount, ids);

  const { data: exp, error } = await admin
    .from("shared_expenses")
    .insert({
      workspace_id: input.workspaceId,
      paid_by: user.id,
      date: tx.date as string,
      label: tx.label as string,
      amount,
      category: (tx.category as string | null) ?? null,
      source_transaction_id: input.transactionId,
    })
    .select("id")
    .single();
  if (error || !exp) throw new Error(error?.message ?? "Partage impossible.");

  const { error: shErr } = await admin.from("shared_expense_shares").insert(
    shares.map((s) => ({ expense_id: exp.id, user_id: s.userId, share_amount: s.amount }))
  );
  if (shErr) throw new Error(shErr.message);
}

// Ajout express depuis n'importe où (ex. l'espace perso) : payé par l'utilisateur
// courant, réparti équitablement. Le chemin le plus court pour alimenter un groupe.
export async function quickAddSharedExpense(input: {
  workspaceId: string;
  label: string;
  amount: number;
  date?: string;
}) {
  const { user, admin } = await requireActiveMember(input.workspaceId);

  const label = input.label.trim();
  const amount = round2(input.amount);
  if (!label) throw new Error("Libellé requis.");
  if (!(amount > 0)) throw new Error("Montant invalide.");

  const ids = await activeMemberIds(admin, input.workspaceId);
  const shares = equalShares(amount, ids);
  const date = input.date || new Date().toISOString().slice(0, 10);

  const { data: exp, error } = await admin
    .from("shared_expenses")
    .insert({
      workspace_id: input.workspaceId,
      paid_by: user.id,
      date,
      label,
      amount,
      category: null,
    })
    .select("id")
    .single();
  if (error || !exp) throw new Error(error?.message ?? "Ajout impossible.");

  const { error: shErr } = await admin.from("shared_expense_shares").insert(
    shares.map((s) => ({ expense_id: exp.id, user_id: s.userId, share_amount: s.amount }))
  );
  if (shErr) throw new Error(shErr.message);
}
