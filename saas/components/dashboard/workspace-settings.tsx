"use client";

import { useState } from "react";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteWorkspace, leaveWorkspace } from "@/lib/actions/workspaces";

export function WorkspaceSettings({
  workspace,
}: {
  workspace: { id: string; name: string; role: string };
}) {
  const [busy, setBusy] = useState(false);
  const isOwner = workspace.role === "owner";

  async function handleLeave() {
    if (
      !window.confirm(
        `Quitter l'espace « ${workspace.name} » ? Vous perdrez l'accès à ses données.`
      )
    )
      return;
    setBusy(true);
    try {
      await leaveWorkspace(workspace.id);
      window.location.href = "/dashboard"; // re-résout l'espace courant
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action impossible.");
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Supprimer définitivement « ${workspace.name} » et TOUTES ses données ` +
          `(comptes, transactions, budgets…) ? Cette action est irréversible.`
      )
    )
      return;
    setBusy(true);
    try {
      await deleteWorkspace(workspace.id);
      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
      setBusy(false);
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">Zone de danger</CardTitle>
        <CardDescription>
          {isOwner
            ? "Supprimer cet espace efface définitivement toutes ses données."
            : "Vous pouvez quitter cet espace à tout moment."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOwner ? (
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={busy}
            onClick={handleDelete}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Supprimer « {workspace.name} »
          </Button>
        ) : (
          <Button variant="outline" disabled={busy} onClick={handleLeave}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Quitter « {workspace.name} »
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
