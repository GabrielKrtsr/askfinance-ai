"use server";

import { appendAuditEvent } from "@/lib/audit";
import { getCurrentWorkspace } from "@/lib/data/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/server";

async function context() {
  const [user, workspace] = await Promise.all([getAuthUser(), getCurrentWorkspace()]);
  if (!user || !workspace) throw new Error("Non authentifié.");
  const admin = createAdminClient();
  const { data: member } = await admin.from("workspace_members").select("role, status").eq("workspace_id", workspace.id).eq("user_id", user.id).maybeSingle();
  if (!member || member.status !== "active" || member.role === "viewer") throw new Error("Accès en lecture seule.");
  return { user, workspace, admin };
}

export async function createReceivable(input: { client: string; amount: number; dueDate: string; invoiceNumber?: string; contactEmail?: string }) {
  const { user, workspace, admin } = await context();
  const { data, error } = await admin.from("expected_receivables").insert({ workspace_id: workspace.id, client: input.client.trim(), amount: input.amount, due_date: input.dueDate, invoice_number: input.invoiceNumber?.trim() || null, contact_email: input.contactEmail?.trim() || null }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Création impossible.");
  await appendAuditEvent(admin, { workspaceId: workspace.id, actorId: user.id, action: "receivable.created", entityType: "receivable", entityId: data.id, metadata: { client: input.client, amount: input.amount, invoiceNumber: input.invoiceNumber } });
  return true;
}

export async function confirmReceivablePayment(receivableId: string) {
  const { user, workspace, admin } = await context();
  const { data: receivable } = await admin.from("expected_receivables").select("amount").eq("id", receivableId).eq("workspace_id", workspace.id).single();
  if (!receivable) throw new Error("Encaissement introuvable.");
  const { error } = await admin.from("expected_receivables").update({ status: "received", paid_amount: receivable.amount, received_at: new Date().toISOString().slice(0, 10), matched_at: new Date().toISOString() }).eq("id", receivableId).eq("workspace_id", workspace.id);
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, { workspaceId: workspace.id, actorId: user.id, action: "receivable.payment_confirmed", entityType: "receivable", entityId: receivableId, metadata: { amount: receivable.amount } });
  return true;
}

export async function recordPartialReceivablePayment(receivableId: string, paymentAmount: number) {
  const { user, workspace, admin } = await context();
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) throw new Error("Montant invalide.");
  const { data: receivable } = await admin.from("expected_receivables").select("amount, paid_amount").eq("id", receivableId).eq("workspace_id", workspace.id).single();
  if (!receivable) throw new Error("Encaissement introuvable.");
  const total = Number(receivable.amount);
  const paid = Math.min(total, Number(receivable.paid_amount ?? 0) + paymentAmount);
  const received = paid >= total;
  const { error } = await admin.from("expected_receivables").update({ status: received ? "received" : "partial", paid_amount: paid, received_at: received ? new Date().toISOString().slice(0, 10) : null, matched_at: new Date().toISOString() }).eq("id", receivableId).eq("workspace_id", workspace.id);
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, { workspaceId: workspace.id, actorId: user.id, action: received ? "receivable.payment_confirmed" : "receivable.partial_payment_recorded", entityType: "receivable", entityId: receivableId, metadata: { paymentAmount, paidTotal: paid, remaining: Math.max(0, total - paid) } });
  return true;
}

export async function recordReceivableReminder(input: { receivableId: string; content: string; sent?: boolean }) {
  const { user, workspace, admin } = await context();
  const { data: receivable } = await admin.from("expected_receivables").select("id").eq("id", input.receivableId).eq("workspace_id", workspace.id).maybeSingle();
  if (!receivable) throw new Error("Encaissement introuvable.");
  const { data, error } = await admin.from("receivable_reminders").insert({ workspace_id: workspace.id, receivable_id: input.receivableId, content: input.content, status: input.sent ? "sent" : "draft", sent_at: input.sent ? new Date().toISOString() : null, created_by: user.id }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Relance impossible.");
  await appendAuditEvent(admin, { workspaceId: workspace.id, actorId: user.id, action: input.sent ? "receivable.reminder_sent" : "receivable.reminder_drafted", entityType: "receivable", entityId: input.receivableId, metadata: { reminderId: data.id } });
  return true;
}

export async function removeReceivable(receivableId: string) {
  const { user, workspace, admin } = await context();
  const { error } = await admin.from("expected_receivables").delete().eq("id", receivableId).eq("workspace_id", workspace.id);
  if (error) throw new Error(error.message);
  await appendAuditEvent(admin, { workspaceId: workspace.id, actorId: user.id, action: "receivable.deleted", entityType: "receivable", entityId: receivableId });
  return true;
}
