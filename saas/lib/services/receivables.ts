import { createClient } from "@/lib/supabase/client";

export type ReceivableStatus = "received" | "late" | "upcoming";

export interface Receivable {
  id: string;
  client: string;
  montant_attendu: number;
  date_prevue: string | null; // ISO
  statut: ReceivableStatus;
  jours_retard: number;
  date_recu: string | null; // ISO (si reçu)
  relance: string | null; // brouillon de relance (si en retard)
}

export interface ReceivablesResult {
  receivables: Receivable[];
  en_retard: Receivable[];
  total_attendu: number;
  total_en_retard: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EMPTY: ReceivablesResult = {
  receivables: [],
  en_retard: [],
  total_attendu: 0,
  total_en_retard: 0,
};

// Récupère l'échéancier rapproché (attendu vs reçu) de l'espace courant.
export async function getReceivables(
  workspaceId: string
): Promise<ReceivablesResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !workspaceId) return EMPTY;

  const res = await fetch(`${API_URL}/transactions/receivables`, {
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId },
  });
  if (!res.ok) throw new Error("Échec du radar des encaissements.");
  return res.json();
}

// Déclare un encaissement attendu dans l'espace (RLS : membre actif).
export async function createExpectedReceivable(
  workspaceId: string,
  client: string,
  amount: number,
  dueDate: string
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("expected_receivables").insert({
    workspace_id: workspaceId,
    client,
    amount,
    due_date: dueDate,
  });
  return !error;
}

// Supprime un encaissement attendu.
export async function deleteExpectedReceivable(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("expected_receivables")
    .delete()
    .eq("id", id);
  return !error;
}
