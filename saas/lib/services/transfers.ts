import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Apparie et marque les virements internes de l'espace courant. Renvoie le nombre marqué.
export async function detectTransfers(workspaceId: string): Promise<number> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !workspaceId) return 0;

  const res = await fetch(`${API_URL}/transactions/detect-transfers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId },
  });
  if (!res.ok) throw new Error("Échec de la détection des virements.");
  const data = await res.json();
  return data.flagged ?? 0;
}
