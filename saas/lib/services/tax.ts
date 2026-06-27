import { createClient } from "@/lib/supabase/client";

export interface TaxDetail {
  poste: string;
  type: "tva" | "social" | "is";
  taux: number;
  montant_mensuel: number;
}

export interface TaxDeadline {
  date: string; // ISO
  type: "tva" | "social" | "is";
  libelle: string;
  montant_estime: number;
}

export interface TaxVault {
  configure: boolean;
  ca_mensuel_reference: number;
  provision_mensuelle: number;
  detail: TaxDetail[];
  echeances: TaxDeadline[];
}

export interface TaxSettings {
  provision_tva_taux: number;
  provision_social_taux: number;
  provision_is_taux: number;
  tva_periodicite: "mensuel" | "trimestriel" | "annuel" | "aucun";
  urssaf_periodicite: "mensuel" | "trimestriel";
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  provision_tva_taux: 0,
  provision_social_taux: 0,
  provision_is_taux: 0,
  tva_periodicite: "mensuel",
  urssaf_periodicite: "trimestriel",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EMPTY_VAULT: TaxVault = {
  configure: false,
  ca_mensuel_reference: 0,
  provision_mensuelle: 0,
  detail: [],
  echeances: [],
};

// Récupère la synthèse du coffre-fort fiscal depuis l'API Python.
export async function getTaxVault(): Promise<TaxVault> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return EMPTY_VAULT;

  const res = await fetch(`${API_URL}/transactions/tax-vault`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Échec du coffre-fort fiscal.");
  return res.json();
}

// Lit les réglages fiscaux de l'utilisateur (RLS), ou les valeurs par défaut.
export async function getTaxSettings(): Promise<TaxSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tax_settings")
    .select(
      "provision_tva_taux, provision_social_taux, provision_is_taux, tva_periodicite, urssaf_periodicite"
    )
    .limit(1)
    .maybeSingle();
  if (!data) return DEFAULT_TAX_SETTINGS;
  return {
    provision_tva_taux: Number(data.provision_tva_taux),
    provision_social_taux: Number(data.provision_social_taux),
    provision_is_taux: Number(data.provision_is_taux),
    tva_periodicite: data.tva_periodicite,
    urssaf_periodicite: data.urssaf_periodicite,
  };
}

// Enregistre (upsert) les réglages fiscaux de l'utilisateur connecté.
export async function saveTaxSettings(settings: TaxSettings): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("tax_settings")
    .upsert({ user_id: user.id, ...settings }, { onConflict: "user_id" });
  return !error;
}
