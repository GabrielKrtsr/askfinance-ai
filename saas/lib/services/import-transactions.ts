import { createClient } from "@/lib/supabase/client";

// Résultat renvoyé par l'API Python.
export interface ImportResult {
  inserted: number; // lignes insérées en base
  duplicates: number; // lignes ignorées car déjà présentes
  skipped: number; // lignes ignorées (format invalide)
  errors: string[]; // message d'erreur éventuel
}

// URL de l'API FastAPI (défaut : serveur local de dev).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Envoie le relevé CSV à l'API Python qui le parse (pandas) et l'insère en base.
 * L'authentification se fait via le token d'accès de l'utilisateur connecté.
 */
export async function importTransactionsFromCsv(
  file: File,
  accountId: string
): Promise<ImportResult> {
  const empty = { inserted: 0, duplicates: 0, skipped: 0 };

  // 1. Récupérer le token de l'utilisateur connecté
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { ...empty, errors: ["Vous devez être connecté."] };
  }

  // 2. Envoyer le fichier + le compte cible à l'API (multipart/form-data)
  const form = new FormData();
  form.append("file", file);
  form.append("account_id", accountId);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/transactions/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form, // le navigateur fixe lui-même le Content-Type multipart
    });
  } catch {
    return {
      ...empty,
      errors: ["Impossible de joindre l'API. Le serveur Python est-il démarré ?"],
    };
  }

  // 3. Gérer la réponse
  if (!res.ok) {
    let detail = "Échec de l'import.";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // réponse non-JSON
    }
    return { ...empty, errors: [detail] };
  }

  const data = await res.json();
  return {
    inserted: data.inserted ?? 0,
    duplicates: data.duplicates ?? 0,
    skipped: data.skipped ?? 0,
    errors: [],
  };
}
