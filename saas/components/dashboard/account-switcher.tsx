"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, deleteAccount, getAccountDeletionImpact } from "@/lib/services/accounts";
import type { AccountOption } from "@/lib/data/dashboard";

export function AccountSwitcher({
  accounts,
  selected,
  canDelete,
}: {
  accounts: AccountOption[];
  selected: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function navigate(account: string) {
    const p = new URLSearchParams(params.toString());
    p.set("account", account);
    router.push(`${pathname}?${p.toString()}`);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    const acc = await createAccount(
      name.trim(),
      Number(opening.replace(",", ".")) || 0
    );
    setSaving(false);
    if (!acc) return;
    setAdding(false);
    setName("");
    setOpening("");
    navigate(acc.id);
    router.refresh();
  }

  async function handleDelete() {
    if (selected === "all") return;
    setDeleting(true);
    try {
      const impact = await getAccountDeletionImpact(selected);
      const confirmation = window.prompt(
        `Supprimer « ${impact.name} » supprimera définitivement ${impact.transactions} transaction(s) et ${impact.imports} import(s).\n\nSaisissez exactement le nom du compte pour confirmer :`
      );
      if (confirmation === null) return;
      await deleteAccount(selected, confirmation);
      toast.success(`Compte « ${impact.name} » supprimé`);
      navigate("all");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du compte"
          className="h-9 w-36"
        />
        <Input
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder="Solde €"
          inputMode="decimal"
          className="h-9 w-24"
        />
        <Button size="sm" onClick={handleCreate} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={navigate}>
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les comptes</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAdding(true)}
        aria-label="Nouveau compte"
      >
        <Plus className="h-4 w-4" />
      </Button>
      {canDelete ? (
        <Button
          variant="outline"
          size="sm"
          disabled={deleting || selected === "all"}
          onClick={handleDelete}
          aria-label="Supprimer le compte sélectionné"
          title={selected === "all" ? "Sélectionnez un compte à supprimer" : "Supprimer le compte sélectionné"}
          className="text-muted-foreground hover:border-red-200 hover:text-red-600"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );
}
