"use server";

import { revalidatePath } from "next/cache";
import { appendAuditEvent } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/server";

async function membership(workspaceId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Non authentifié.");
  const admin = createAdminClient();
  const { data } = await admin.from("workspace_members").select("role, status")
    .eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!data || data.status !== "active" || data.role === "viewer") throw new Error("Accès refusé.");
  return { user, admin, role: data.role as string };
}

export async function createWorkflowItem(input: {
  workspaceId: string; title: string; description?: string; kind: string; assignedTo?: string;
  entityType?: string; entityId?: string;
}) {
  const { user, admin } = await membership(input.workspaceId);
  const { data, error } = await admin.from("workflow_items").insert({
    workspace_id: input.workspaceId, title: input.title.trim().slice(0, 160),
    description: input.description?.trim() || null, kind: input.kind,
    assigned_to: input.assignedTo || null, entity_type: input.entityType || null,
    entity_id: input.entityId || null, created_by: user.id,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Workflow impossible.");
  await appendAuditEvent(admin, { workspaceId: input.workspaceId, actorId: user.id, action: "workflow.created", entityType: "workflow", entityId: data.id, metadata: { title: input.title, assignedTo: input.assignedTo } });
  revalidatePath("/dashboard/members");
}

export async function reviewWorkflowItem(input: { workspaceId: string; workflowId: string; decision: "approved" | "rejected" }) {
  const { user, admin, role } = await membership(input.workspaceId);
  if (!['owner', 'admin'].includes(role)) throw new Error("Validation réservée aux responsables.");
  const { data, error } = await admin.from("workflow_items").update({ status: input.decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", input.workflowId).eq("workspace_id", input.workspaceId).eq("status", "pending").select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ce workflow a déjà été traité.");
  await appendAuditEvent(admin, { workspaceId: input.workspaceId, actorId: user.id, action: `workflow.${input.decision}`, entityType: "workflow", entityId: input.workflowId });
  revalidatePath("/dashboard/members");
}
