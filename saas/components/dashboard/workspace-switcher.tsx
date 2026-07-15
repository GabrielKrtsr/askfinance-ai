"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteWorkspace,
  leaveWorkspace,
  switchWorkspace,
} from "@/lib/actions/workspaces";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

type WorkspaceType = "personal" | "business" | "group";

interface WorkspaceItem {
  id: string;
  name: string;
  type: WorkspaceType;
  role: string;
}

function WorkspaceIcon({ type, className }: { type: WorkspaceType; className?: string }) {
  const Icon = type === "business" ? Building2 : type === "group" ? Users : User;
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} />;
}

export function WorkspaceSwitcher({
  workspaces,
  current,
}: {
  workspaces: WorkspaceItem[];
  current: WorkspaceItem;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [manageTarget, setManageTarget] = useState<WorkspaceItem | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [managing, setManaging] = useState(false);

  async function handleSwitch(id: string) {
    if (id === current.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchWorkspace(id);
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.workspace.switchFailed);
    } finally {
      setSwitching(false);
    }
  }

  function goCreate() {
    setOpen(false);
    router.push("/onboarding?new=1");
  }

  function openManagement(workspace: WorkspaceItem) {
    setOpen(false);
    setConfirmation("");
    setManageTarget(workspace);
  }

  async function handleManagement() {
    if (!manageTarget) return;
    const isOwner = manageTarget.role === "owner";
    if (isOwner && confirmation.trim() !== manageTarget.name) return;

    setManaging(true);
    try {
      if (isOwner) {
        await deleteWorkspace(manageTarget.id);
        toast.success(copy.workspace.deletedNamed(manageTarget.name));
      } else {
        await leaveWorkspace(manageTarget.id);
        toast.success(copy.workspace.leftNamed(manageTarget.name));
      }
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.workspace.actionFailed);
      setManaging(false);
    }
  }

  const isDeleting = manageTarget?.role === "owner";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <WorkspaceIcon type={current.type} />
        <span className="max-w-[140px] truncate">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={copy.workspace.closeSelector}
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 z-50 mt-1.5 w-72 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {copy.workspace.title}
            </p>
            {workspaces.map((workspace) => {
              const active = workspace.id === current.id;
              const owner = workspace.role === "owner";
              return (
                <div
                  key={workspace.id}
                  className={cn(
                    "group flex items-center rounded-md transition-colors",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <button
                    type="button"
                    disabled={switching || managing}
                    onClick={() => handleSwitch(workspace.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm disabled:opacity-50"
                  >
                    <WorkspaceIcon type={workspace.type} />
                    <span className="min-w-0 flex-1 truncate text-left">{workspace.name}</span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                  <button
                    type="button"
                    disabled={switching || managing}
                    onClick={() => openManagement(workspace)}
                    className={cn(
                      "mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-background hover:opacity-100 disabled:opacity-40",
                      owner ? "hover:text-red-600" : "hover:text-foreground"
                    )}
                    aria-label={owner ? copy.workspace.deleteNamed(workspace.name) : copy.workspace.leaveNamed(workspace.name)}
                    title={owner ? copy.workspace.deleteWorkspace : copy.workspace.leaveWorkspace}
                  >
                    {owner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={goCreate}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4 shrink-0" />
              {copy.workspace.createJoin}
            </button>
          </div>
        </>
      )}

      {manageTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={copy.common.close}
            onClick={() => !managing && setManageTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", isDeleting ? "bg-red-50 text-red-600 dark:bg-red-950/40" : "bg-muted text-foreground")}>
                {isDeleting ? <Trash2 className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              </div>
              <button
                type="button"
                disabled={managing}
                onClick={() => setManageTarget(null)}
                className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                aria-label={copy.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-5 text-xl font-bold tracking-tight">
              {isDeleting ? copy.workspace.deleteTitle : copy.workspace.leaveTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isDeleting
                ? copy.workspace.deleteImpact(manageTarget.name)
                : copy.workspace.leaveImpact(manageTarget.name)}
            </p>

            {isDeleting && (
              <div className="mt-5 space-y-2">
                <label htmlFor="workspace-delete-confirmation" className="text-sm font-medium">
                  {copy.workspace.typeToConfirm.replace("{name}", manageTarget.name)}
                </label>
                <Input
                  id="workspace-delete-confirmation"
                  autoFocus
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && confirmation.trim() === manageTarget.name && !managing) {
                      handleManagement();
                    }
                  }}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" disabled={managing} onClick={() => setManageTarget(null)}>
                {copy.common.cancel}
              </Button>
              <Button
                variant={isDeleting ? "destructive" : "default"}
                disabled={managing || (isDeleting && confirmation.trim() !== manageTarget.name)}
                onClick={handleManagement}
              >
                {managing ? <Loader2 className="h-4 w-4 animate-spin" /> : isDeleting ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                {isDeleting ? copy.workspace.deleteForever : copy.workspace.leave}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
