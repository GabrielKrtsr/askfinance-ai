"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Plus, User, Users } from "lucide-react";

import { switchWorkspace } from "@/lib/actions/workspaces";
import { cn } from "@/lib/utils";

type WorkspaceType = "personal" | "business" | "group";

interface WorkspaceItem {
  id: string;
  name: string;
  type: WorkspaceType;
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
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function handleSwitch(id: string) {
    if (id === current.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchWorkspace(id);
      setOpen(false);
      // On repart du tableau de bord : la page courante peut être propre à l'autre type.
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  function goCreate() {
    setOpen(false);
    router.push("/onboarding");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <WorkspaceIcon type={current.type} />
        <span className="max-w-[140px] truncate">{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <>
          {/* Clic à l'extérieur pour refermer. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-1.5 w-60 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
            <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Vos espaces
            </p>
            {workspaces.map((w) => {
              const active = w.id === current.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={switching}
                  onClick={() => handleSwitch(w.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors disabled:opacity-50",
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <WorkspaceIcon type={w.type} />
                  <span className="min-w-0 flex-1 truncate text-left">{w.name}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={goCreate}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Créer ou rejoindre un espace
            </button>
          </div>
        </>
      )}
    </div>
  );
}
