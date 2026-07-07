import { createClient } from "@/lib/supabase/client";

export interface RecurringCharge {
  merchant: string;
  type: string; // "abonnement" | "fixe" | "variable"
  frequence: string; // "mensuel" | "hebdomadaire" | ...
  montant_mensuel: number;
  dernier_montant: number;
  occurrences: number;
  prochaine_date: string;
  alerte: "hausse" | "doublon" | null;
}

export interface RecurringResult {
  charges: RecurringCharge[];
  total_mensuel: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Récupère les charges récurrentes détectées pour l'espace courant.
export async function getRecurringCharges(
  workspaceId: string
): Promise<RecurringResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !workspaceId) return { charges: [], total_mensuel: 0 };

  const res = await fetch(`${API_URL}/transactions/recurring`, {
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId },
  });
  if (!res.ok) {
    throw new Error("Échec de la récupération des charges récurrentes.");
  }
  return res.json();
}
