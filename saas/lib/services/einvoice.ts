import { createClient } from "@/lib/supabase/client";

// Récupère l'état de la checklist de préparation (clé item -> coché).
export async function getEInvoiceChecklist(): Promise<Record<string, boolean>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("einvoice_checklist")
    .select("item_key, done");
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) {
    map[(row as { item_key: string }).item_key] = Boolean(
      (row as { done: boolean }).done
    );
  }
  return map;
}

// Coche / décoche un item (upsert sur user_id + item_key).
export async function toggleEInvoiceItem(
  itemKey: string,
  done: boolean
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("einvoice_checklist").upsert(
    {
      user_id: user.id,
      item_key: itemKey,
      done,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,item_key" }
  );
  return !error;
}
