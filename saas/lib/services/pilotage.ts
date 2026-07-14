import { createClient } from "@/lib/supabase/client";
import type { ForecastResult } from "@/lib/services/forecast";
import type { RecurringResult } from "@/lib/services/recurring";
import type { ReceivablesResult } from "@/lib/services/receivables";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PilotageData {
  forecast: ForecastResult;
  recurring: RecurringResult;
  receivables: ReceivablesResult;
}

// Charge en UN SEUL appel les données des trois widgets de la page Pilotage :
// une seule validation de token et une seule lecture des transactions côté API,
// au lieu de trois requêtes qui refont chacune tout le travail.
export async function getPilotageData(
  workspaceId: string
): Promise<PilotageData | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !workspaceId) return null;

  const res = await fetch(`${API_URL}/transactions/pilotage`, {
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId },
  });
  if (!res.ok) throw new Error("Échec du chargement du pilotage.");
  return res.json();
}
