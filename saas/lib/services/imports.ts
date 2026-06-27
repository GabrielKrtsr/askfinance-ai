import { createClient } from "@/lib/supabase/client";

export interface ImportBatch {
  id: string;
  filename: string | null;
  count: number;
  created_at: string;
  account_id: string | null;
}

// Liste les imports de l'utilisateur (les plus récents d'abord).
export async function getImports(): Promise<ImportBatch[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("imports")
    .select("id, filename, count, created_at, account_id")
    .order("created_at", { ascending: false });
  return (data ?? []) as ImportBatch[];
}

// Annule un import : supprime le lot → ses transactions sont supprimées en cascade.
export async function cancelImport(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("imports").delete().eq("id", id);
  return !error;
}
