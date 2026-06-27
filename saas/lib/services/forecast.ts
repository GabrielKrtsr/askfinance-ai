import { createClient } from "@/lib/supabase/client";

export interface ForecastPoint {
  date: string; // ISO
  solde: number;
  borne_basse: number;
  borne_haute: number;
}

export interface ForecastResult {
  solde_actuel: number;
  serie: ForecastPoint[];
  premier_decouvert: string | null;
  solde_min: number;
  alerte_30j: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EMPTY: ForecastResult = {
  solde_actuel: 0,
  serie: [],
  premier_decouvert: null,
  solde_min: 0,
  alerte_30j: false,
};

// Récupère la prévision de trésorerie 90 jours depuis l'API Python.
export async function getForecast(): Promise<ForecastResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return EMPTY;

  const res = await fetch(`${API_URL}/transactions/forecast`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Échec de la prévision de trésorerie.");
  return res.json();
}
