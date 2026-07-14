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
const MAX_IMPORT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Envoie le relevé CSV à l'API Python qui le parse (pandas) et l'insère en base.
 * L'authentification se fait via le token d'accès de l'utilisateur connecté.
 */
export async function importTransactionsFromCsv(
  file: File,
  accountId: string,
  onProgress?: (progress: number) => void
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
  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    return { ...empty, errors: ["Le fichier dépasse la limite autorisée de 10 Mo."] };
  }

  // 2. Le navigateur envoie directement le CSV dans le bucket privé. Le fichier
  //    volumineux ne traverse ainsi ni Next.js, ni le service web FastAPI.
  const storagePath = `${session.user.id}/${crypto.randomUUID()}.csv`;
  const { error: uploadError } = await supabase.storage
    .from("transaction-imports")
    .upload(storagePath, file, { contentType: file.type || "text/csv" });
  if (uploadError) {
    return { ...empty, errors: [`Envoi du fichier impossible : ${uploadError.message}`] };
  }
  onProgress?.(5);
  onProgress?.(25);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/transactions/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_id: accountId,
        storage_path: storagePath,
        filename: file.name,
      }),
    });
  } catch {
    await supabase.storage.from("transaction-imports").remove([storagePath]);
    return {
      ...empty,
      errors: ["Impossible de joindre l'API. Le serveur Python est-il démarré ?"],
    };
  }

  // 3. Gérer la réponse
  if (!res.ok) {
    await supabase.storage.from("transaction-imports").remove([storagePath]);
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
  onProgress?.(100);
  return {
    inserted: data.inserted ?? 0,
    duplicates: data.duplicates ?? 0,
    skipped: data.skipped ?? 0,
    errors: [],
  };
}
