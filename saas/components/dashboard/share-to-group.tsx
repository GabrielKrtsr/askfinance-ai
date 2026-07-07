"use client";

import { useState } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { shareTransactionToGroup } from "@/lib/actions/shared-expenses";

// Bouton compact : pousse une transaction perso vers un groupe (dépense partagée).
export function ShareToGroupButton({
  transactionId,
  groups,
}: {
  transactionId: string;
  groups: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function share(workspaceId: string, name: string) {
    setBusy(true);
    try {
      await shareTransactionToGroup({ transactionId, workspaceId });
      toast.success(`Ajouté à « ${name} »`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Partage impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (groups.length === 0) return null;

  const trigger = (onClick: () => void) => (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={onClick}
      className="h-8 gap-1.5"
      title="Ajouter à un groupe"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Users className="h-3.5 w-3.5" />
      )}
      Ajouter
    </Button>
  );

  // Un seul groupe → action directe ; plusieurs → petit menu.
  if (groups.length === 1) {
    return trigger(() => share(groups[0].id, groups[0].name));
  }

  return (
    <div className="relative inline-block">
      {trigger(() => setOpen((v) => !v))}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              Ajouter à…
            </p>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => share(g.id, g.name)}
                className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
