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

// Récupère la synthèse du coffre-fort fiscal de l'espace courant.
export async function getTaxVault(workspaceId: string): Promise<TaxVault> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token || !workspaceId) return EMPTY_VAULT;

  const res = await fetch(`${API_URL}/transactions/tax-vault`, {
    headers: { Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId },
  });
  if (!res.ok) throw new Error("Échec du coffre-fort fiscal.");
  return res.json();
}

// Lit les réglages fiscaux de l'espace (colonnes DB anglaises, remap vers l'UI).
export async function getTaxSettings(workspaceId: string): Promise<TaxSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tax_settings")
    .select(
      "vat_provision_rate, social_provision_rate, corporate_tax_provision_rate, vat_periodicity, urssaf_periodicity"
    )
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  if (!data) return DEFAULT_TAX_SETTINGS;
  return {
    provision_tva_taux: Number(data.vat_provision_rate),
    provision_social_taux: Number(data.social_provision_rate),
    provision_is_taux: Number(data.corporate_tax_provision_rate),
    tva_periodicite: data.vat_periodicity,
    urssaf_periodicite: data.urssaf_periodicity,
  };
}

// Enregistre (upsert) les réglages fiscaux de l'espace.
export async function saveTaxSettings(
  workspaceId: string,
  settings: TaxSettings
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("tax_settings").upsert(
    {
      workspace_id: workspaceId,
      vat_provision_rate: settings.provision_tva_taux,
      social_provision_rate: settings.provision_social_taux,
      corporate_tax_provision_rate: settings.provision_is_taux,
      vat_periodicity: settings.tva_periodicite,
      urssaf_periodicity: settings.urssaf_periodicite,
    },
    { onConflict: "workspace_id" }
  );
  return !error;
}
