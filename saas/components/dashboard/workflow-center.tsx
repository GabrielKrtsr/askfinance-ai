"use client";

import { useState } from "react";
import { Check, ClipboardCheck, History, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createWorkflowItem, reviewWorkflowItem } from "@/lib/actions/workflows";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

interface Workflow { id: string; title: string; description: string | null; kind: string; status: string; created_at: string }
interface Audit { id: string; action: string; entity_type: string; created_at: string; metadata: Record<string, unknown> }

export function WorkflowCenter({ workspaceId, workflows, audit, role }: { workspaceId: string; workflows: Workflow[]; audit: Audit[]; role: string }) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = dashboardCopy[locale].workflow;
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const canReview = role === "owner" || role === "admin";

  async function create() {
    if (!title.trim()) return;
    setBusy("create");
    try { await createWorkflowItem({ workspaceId, title, kind: "validation" }); setTitle(""); router.refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : copy.createFailed); }
    finally { setBusy(null); }
  }
  async function review(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    try { await reviewWorkflowItem({ workspaceId, workflowId: id, decision }); router.refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : copy.reviewFailed); }
    finally { setBusy(null); }
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" />{copy.title}</h2>
      {role !== "viewer" && <div className="mt-3 flex gap-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.placeholder} onKeyDown={(e) => e.key === "Enter" && create()} /><Button onClick={create} disabled={busy === "create"}><Plus className="h-4 w-4" />{copy.create}</Button></div>}
      <ul className="mt-4 divide-y">{workflows.map((item) => <li key={item.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.status === "pending" ? copy.pending : item.status === "approved" ? copy.approved : item.status === "rejected" ? copy.rejected : item.status}</p></div>{canReview && item.status === "pending" && <div className="flex gap-1"><Button size="icon" variant="outline" aria-label={copy.approve} disabled={busy === item.id} onClick={() => review(item.id, "approved")}>{busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" aria-label={copy.reject} disabled={busy === item.id} onClick={() => review(item.id, "rejected")}><X className="h-4 w-4" /></Button></div>}</li>)}</ul>
    </Card>
    <Card className="p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" />{copy.audit}</h2><ul className="mt-3 max-h-80 divide-y overflow-y-auto">{audit.length ? audit.map((event) => <li key={event.id} className="py-2"><p className="text-sm">{event.action}</p><p className="text-xs text-muted-foreground">{event.entity_type} · {new Date(event.created_at).toLocaleString(locale === "fr" ? "fr-FR" : locale === "uk" ? "uk-UA" : "en-GB")}</p></li>) : <li className="py-8 text-center text-sm text-muted-foreground">{copy.emptyAudit}</li>}</ul></Card>
  </div>;
}
