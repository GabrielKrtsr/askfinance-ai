"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspace } from "@/lib/data/workspace";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/audit";

export async function updateTransactionCategory(input: {
  transactionId: string;
  category: string;
  applyToMerchant?: boolean;
}) {
  const [user, workspace] = await Promise.all([getAuthUser(), getCurrentWorkspace()]);
  if (!user || !workspace) throw new Error("Non authentifié.");

  const category = input.category.trim().slice(0, 80);
  if (!category) throw new Error("La catégorie est requise.");

  const supabase = createClient();
  const { data: transaction, error: readError } = await supabase
    .from("transactions")
    .select("id, label")
    .eq("id", input.transactionId)
    .eq("workspace_id", workspace.id)
    .single();
  if (readError || !transaction) throw new Error("Transaction introuvable.");

  let update = supabase
    .from("transactions")
    .update({ category, category_source: "manual", category_confidence: 1 })
    .eq("workspace_id", workspace.id);
  update = input.applyToMerchant
    ? update.eq("label", transaction.label)
    : update.eq("id", input.transactionId);
  const { error: updateError } = await update;
  if (updateError) throw new Error(updateError.message);

  if (input.applyToMerchant) {
    const { error: ruleError } = await supabase
      .from("transaction_category_rules")
      .upsert(
        {
          workspace_id: workspace.id,
          label_key: String(transaction.label).trim().toLocaleLowerCase("fr"),
          category,
          created_by: user.id,
        },
        { onConflict: "workspace_id,label_key" }
      );
    if (ruleError) throw new Error(ruleError.message);
  }

  await appendAuditEvent(createAdminClient(), {
    workspaceId: workspace.id,
    actorId: user.id,
    action: input.applyToMerchant ? "transaction.category_rule_created" : "transaction.category_changed",
    entityType: "transaction",
    entityId: input.transactionId,
    metadata: { category, label: transaction.label },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  return { updated: true };
}
