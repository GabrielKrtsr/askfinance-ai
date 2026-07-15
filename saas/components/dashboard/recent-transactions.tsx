"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { shareTransactionToGroup } from "@/lib/actions/shared-expenses";
import type { RecentTransaction } from "@/lib/data/dashboard";
import { cn, formatEUR } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

// Liste des transactions récentes. Si l'utilisateur a au moins un groupe, chaque
// dépense devient cliquable pour l'ajouter directement comme dépense partagée
// (un seul groupe → ajout direct ; plusieurs → petit menu de choix).
export function RecentTransactions({
  items,
  groups,
}: {
  items: RecentTransaction[];
  groups: { id: string; name: string }[];
}) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  async function add(id: string, workspaceId: string, name: string) {
    setBusyId(id);
    setMenuFor(null);
    try {
      await shareTransactionToGroup({ transactionId: id, workspaceId });
      toast.success(copy.share.added(name));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : copy.share.failed);
    } finally {
      setBusyId(null);
    }
  }

  function onRowClick(id: string) {
    if (groups.length === 1) add(id, groups[0].id, groups[0].name);
    else setMenuFor((m) => (m === id ? null : id));
  }

  if (items.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
        {copy.recent.empty}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((tx) => {
        const shareable = tx.type === "debit" && groups.length > 0;
        return (
          <li key={tx.id} className="relative">
            <div
              onClick={shareable ? () => onRowClick(tx.id) : undefined}
              className={cn(
                "flex items-center gap-4 px-6 py-3.5 transition-colors",
                shareable
                  ? "cursor-pointer hover:bg-muted/40"
                  : "hover:bg-muted/40"
              )}
              title={shareable ? copy.share.title : undefined}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  tx.type === "credit"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {busyId === tx.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : tx.type === "credit" ? (
                  <ArrowDownRight className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tx.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.dateLabel}
                  {shareable && (
                    <span className="text-primary"> {copy.recent.addGroup}</span>
                  )}
                </p>
              </div>
              <Badge variant="muted" className="hidden sm:inline-flex">
                {tx.category}
              </Badge>
              <span
                className={cn(
                  "w-24 text-right text-sm font-semibold tabular-nums",
                  tx.type === "credit" ? "text-emerald-600" : "text-foreground"
                )}
              >
                {tx.type === "credit" ? "+" : ""}
                {formatEUR(tx.amount)}
              </span>
            </div>

            {menuFor === tx.id && groups.length > 1 && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuFor(null)}
                />
                <div className="absolute right-6 top-12 z-50 w-52 overflow-hidden rounded-lg border bg-card p-1 shadow-lg">
                  <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {copy.recent.addTo}
                  </p>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => add(tx.id, g.id, g.name)}
                      className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
