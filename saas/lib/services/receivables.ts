import { createClient } from "@/lib/supabase/client";

export interface Receivable {
  client: string;
  key: string; // clé marchand stable (identifiant de ligne)
  frequence: string; // "mensuel" | "hebdomadaire" | ...
  montant_attendu: number;
  dernier_encaissement: string; // ISO
  prochaine_attendue: string; // ISO
  occurrences: number;
  statut: "a_jour" | "en_retard" | "inactif";
  jours_retard: number;
  relance: string | null; // brouillon de relance (si en retard)
}

export interface ReceivablesResult {
  recettes: Receivable[];
  en_retard: Receivable[];
  total_attendu_mensuel: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EMPTY: ReceivablesResult = {
  recettes: [],
  en_retard: [],
  total_attendu_mensuel: 0,
};

// Récupère le radar des encaissements (recettes récurrentes + retards) depuis l'API Python.
export async function getReceivables(): Promise<ReceivablesResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return EMPTY;

  const res = await fetch(`${API_URL}/transactions/receivables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Échec du radar des encaissements.");
  return res.json();
}
