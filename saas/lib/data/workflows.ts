import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/server";

export async function getWorkflowCenter(workspaceId: string) {
  const user = await getAuthUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: me } = await admin.from("workspace_members").select("role, status").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!me || me.status !== "active") return null;
  const [{ data: workflows }, { data: audit }] = await Promise.all([
    admin.from("workflow_items").select("id, title, description, kind, status, assigned_to, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30),
    admin.from("audit_events").select("id, action, entity_type, entity_id, created_at, actor_id, metadata").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
  ]);
  return { workflows: workflows ?? [], audit: audit ?? [], role: me.role as string };
}
