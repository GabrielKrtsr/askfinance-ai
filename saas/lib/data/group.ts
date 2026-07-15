import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authUserDisplayName,
  memberIdentifierFallback,
} from "@/lib/data/user-name";

export interface LedgerMember {
  userId: string;
  name: string;
}

export interface LedgerExpense {
  id: string;
  date: string;
  label: string;
  amount: number;
  category: string | null;
  paidBy: string;
  paidByName: string;
  yourShare: number;
}

export interface LedgerSettlement {
  id: string;
  date: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  status: "paid" | "confirmed" | "disputed";
}

export interface LedgerBalance {
  userId: string;
  name: string;
  net: number; // > 0 : on lui doit ; < 0 : il doit
}

export interface LedgerDebt {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface LedgerContribution {
  userId: string;
  name: string;
  paid: number; // total avancé par ce membre
  share: number; // part théorique qui lui revient
  color: string;
}

export interface GroupLedger {
  members: LedgerMember[];
  expenses: LedgerExpense[];
  settlements: LedgerSettlement[];
  balances: LedgerBalance[];
  debts: LedgerDebt[];
  contributions: LedgerContribution[];
  currentUserId: string;
  total: number;
}

const PALETTE = [
  "#4f46e5", "#14b8a6", "#6366f1", "#0ea5e9",
  "#f59e0b", "#ec4899", "#8b5cf6", "#10b981",
];

const round2 = (n: number) => Math.round(n * 100) / 100;

// Simplifie les soldes en transferts (algorithme glouton : on solde le plus gros
// débiteur avec le plus gros créancier, et ainsi de suite).
function simplify(balances: LedgerBalance[]): LedgerDebt[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ id: b.userId, name: b.name, rem: b.net }))
    .sort((a, b) => b.rem - a.rem);
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ id: b.userId, name: b.name, rem: -b.net }))
    .sort((a, b) => b.rem - a.rem);

  const debts: LedgerDebt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].rem, creditors[j].rem);
    debts.push({
      fromUserId: debtors[i].id,
      fromName: debtors[i].name,
      toUserId: creditors[j].id,
      toName: creditors[j].name,
      amount: round2(pay),
    });
    debtors[i].rem -= pay;
    creditors[j].rem -= pay;
    if (debtors[i].rem < 0.005) i++;
    if (creditors[j].rem < 0.005) j++;
  }
  return debts;
}

interface MemberRow { user_id: string; status: string }
interface ProfileRow { id: string; first_name: string | null; last_name: string | null }
interface ExpenseRow { id: string; date: string; label: string; amount: number; category: string | null; paid_by: string }
interface ShareRow { expense_id: string; user_id: string; share_amount: number }
interface SettlementRow {
  id: string;
  date: string;
  from_user: string;
  to_user: string;
  amount: number;
  status: "paid" | "confirmed" | "disputed";
}

// Registre complet d'un groupe. null si l'appelant n'est pas membre actif (garde
// manuelle : on lit via le client admin pour avoir les noms des autres membres).
export async function getGroupLedger(workspaceId: string): Promise<GroupLedger | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: memberRows } = await admin
    .from("workspace_members")
    .select("user_id, status")
    .eq("workspace_id", workspaceId);
  const activeIds = ((memberRows ?? []) as MemberRow[])
    .filter((m) => m.status === "active")
    .map((m) => m.user_id);
  if (!activeIds.includes(user.id)) return null;

  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", activeIds);
  const nameById = new Map<string, string>(
    ((profileRows ?? []) as ProfileRow[]).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ").trim(),
    ])
  );

  // Certains anciens comptes n'ont pas de profil complet. Dans ce cas, on
  // récupère le nom enregistré par Supabase Auth (email ou fournisseur OAuth).
  const missingNameIds = activeIds.filter((id) => !nameById.get(id));
  await Promise.all(
    missingNameIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const authName = authUserDisplayName(data.user);
      if (authName) nameById.set(id, authName);
    })
  );

  const memberName = (id: string) =>
    nameById.get(id) || memberIdentifierFallback(id);
  const members: LedgerMember[] = activeIds.map((id) => ({
    userId: id,
    name: memberName(id),
  }));

  const { data: expRows } = await admin
    .from("shared_expenses")
    .select("id, date, label, amount, category, paid_by")
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false });
  const expenseRows = (expRows ?? []) as ExpenseRow[];
  const expIds = expenseRows.map((e) => e.id);

  const shareRows: ShareRow[] = expIds.length
    ? (((
        await admin
          .from("shared_expense_shares")
          .select("expense_id, user_id, share_amount")
          .in("expense_id", expIds)
      ).data ?? []) as ShareRow[])
    : [];

  const { data: setRows } = await admin
    .from("settlements")
    .select("id, date, from_user, to_user, amount, status")
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: false });
  const settlementRows = (setRows ?? []) as SettlementRow[];
  const balanceSettlementRows = settlementRows.filter((s) => s.status !== "disputed");

  // Soldes : payé − dû + remboursé − reçu.
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const settleOut = new Map<string, number>();
  const settleIn = new Map<string, number>();
  for (const e of expenseRows) paid.set(e.paid_by, (paid.get(e.paid_by) ?? 0) + Number(e.amount));
  for (const s of shareRows) owed.set(s.user_id, (owed.get(s.user_id) ?? 0) + Number(s.share_amount));
  for (const s of balanceSettlementRows) {
    settleOut.set(s.from_user, (settleOut.get(s.from_user) ?? 0) + Number(s.amount));
    settleIn.set(s.to_user, (settleIn.get(s.to_user) ?? 0) + Number(s.amount));
  }
  const balances: LedgerBalance[] = members.map((m) => ({
    userId: m.userId,
    name: m.name,
    net: round2(
      (paid.get(m.userId) ?? 0) -
        (owed.get(m.userId) ?? 0) +
        (settleOut.get(m.userId) ?? 0) -
        (settleIn.get(m.userId) ?? 0)
    ),
  }));

  // Répartition des paiements : qui a avancé combien (vs sa part théorique).
  const contributions: LedgerContribution[] = members.map((m, i) => ({
    userId: m.userId,
    name: m.name,
    paid: round2(paid.get(m.userId) ?? 0),
    share: round2(owed.get(m.userId) ?? 0),
    color: PALETTE[i % PALETTE.length],
  }));

  const yourShareByExp = new Map<string, number>();
  for (const s of shareRows) {
    if (s.user_id === user.id) yourShareByExp.set(s.expense_id, Number(s.share_amount));
  }

  const expenses: LedgerExpense[] = expenseRows.map((e) => ({
    id: e.id,
    date: e.date,
    label: e.label,
    amount: Number(e.amount),
    category: e.category,
    paidBy: e.paid_by,
    paidByName: memberName(e.paid_by),
    yourShare: round2(yourShareByExp.get(e.id) ?? 0),
  }));

  const settlements: LedgerSettlement[] = settlementRows.map((s) => ({
    id: s.id,
    date: s.date,
    amount: Number(s.amount),
    fromUserId: s.from_user,
    fromName: memberName(s.from_user),
    toUserId: s.to_user,
    toName: memberName(s.to_user),
    status: s.status ?? "paid",
  }));

  return {
    members,
    expenses,
    settlements,
    balances,
    debts: simplify(balances),
    contributions,
    currentUserId: user.id,
    total: round2(expenseRows.reduce((sum, e) => sum + Number(e.amount), 0)),
  };
}
