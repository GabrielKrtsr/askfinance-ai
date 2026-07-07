import { createClient } from "@/lib/supabase/client";

// Récupère l'état de la checklist de préparation de l'espace (clé item -> coché).
export async function getEInvoiceChecklist(
  workspaceId: string
): Promise<Record<string, boolean>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("einvoice_checklist")
    .select("item_key, done")
    .eq("workspace_id", workspaceId);
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) {
    map[(row as { item_key: string }).item_key] = Boolean(
      (row as { done: boolean }).done
    );
  }
  return map;
}

// Coche / décoche un item (upsert sur workspace_id + item_key).
export async function toggleEInvoiceItem(
  workspaceId: string,
  itemKey: string,
  done: boolean
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("einvoice_checklist").upsert(
    {
      workspace_id: workspaceId,
      item_key: itemKey,
      done,
    },
    { onConflict: "workspace_id,item_key" }
  );
  return !error;
}
