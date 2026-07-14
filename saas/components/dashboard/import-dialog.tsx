"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
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
import {
  createAccount,
  getAccounts,
  type Account,
} from "@/lib/services/accounts";
import { importTransactionsFromCsv } from "@/lib/services/import-transactions";
import {
  cancelImport,
  getImports,
  type ImportBatch,
} from "@/lib/services/imports";

function frDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ImportDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [newName, setNewName] = useState("");
  const [newOpening, setNewOpening] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  async function refreshLists() {
    const [accs, imps] = await Promise.all([getAccounts(), getImports()]);
    setAccounts(accs);
    setImports(imps);
    if (accs.length === 0) setMode("new");
    else if (!selectedAccount) setSelectedAccount(accs[0].id);
  }

  function openDialog() {
    setOpen(true);
    refreshLists();
  }

  async function handleImport() {
    // 1. Résoudre le compte cible
    let accountId = selectedAccount;
    if (mode === "new") {
      if (!newName.trim()) return toast.error("Donnez un nom au compte.");
      const acc = await createAccount(
        newName.trim(),
        Number(newOpening.replace(",", ".")) || 0
      );
      if (!acc) return toast.error("Création du compte impossible.");
      accountId = acc.id;
    }
    if (!accountId) return toast.error("Choisissez un compte.");
    if (!file) return toast.error("Choisissez un fichier CSV.");

    // 2. Importer
    setImporting(true);
    setImportProgress(0);
    const res = await importTransactionsFromCsv(file, accountId, setImportProgress);
    setImporting(false);
    setImportProgress(0);

    if (res.inserted > 0) {
      const notes: string[] = [];
      if (res.duplicates > 0) notes.push(`${res.duplicates} doublon(s) ignoré(s)`);
      if (res.skipped > 0) notes.push(`${res.skipped} ligne(s) ignorée(s)`);
      toast.success(`${res.inserted} transaction(s) importée(s)`, {
        description: notes.length ? notes.join(" · ") : undefined,
      });
      setFile(null);
      setNewName("");
      setNewOpening("");
      setMode("existing");
      await refreshLists();
      router.refresh();
    } else if (res.duplicates > 0) {
      toast.info("Aucune nouvelle transaction", {
        description: `${res.duplicates} doublon(s) déjà présent(s)`,
      });
    } else {
      toast.error("Aucune transaction importée", {
        description: res.errors[0] ?? "Vérifiez le format du fichier.",
      });
    }
  }

  async function handleCancel(batch: ImportBatch) {
    if (
      !window.confirm(
        `Annuler cet import et supprimer ses ${batch.count} transaction(s) ?`
      )
    )
      return;
    const ok = await cancelImport(batch.id);
    if (ok) {
      toast.success("Import annulé");
      await refreshLists();
      router.refresh();
    } else {
      toast.error("Annulation impossible.");
    }
  }

  return (
    <>
      <Button size="sm" onClick={openDialog}>
        <Plus className="h-4 w-4" />
        Importer un relevé
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Importer un relevé</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Compte cible */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Compte</label>
                <button
                  type="button"
                  onClick={() =>
                    setMode((m) => (m === "existing" ? "new" : "existing"))
                  }
                  className="text-xs font-medium text-primary hover:underline"
                  disabled={accounts.length === 0}
                >
                  {mode === "existing" ? "+ Nouveau compte" : "Compte existant"}
                </button>
              </div>

              {mode === "existing" ? (
                <Select
                  value={selectedAccount}
                  onValueChange={setSelectedAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nom du compte"
                  />
                  <Input
                    value={newOpening}
                    onChange={(e) => setNewOpening(e.target.value)}
                    placeholder="Solde d'ouverture €"
                    inputMode="decimal"
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {/* Fichier */}
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Fichier CSV</label>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choisir un fichier…"}
              </Button>
            </div>

            <Button
              className="mt-5 w-full"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {importing ? `Import en cours… ${importProgress} %` : "Importer"}
            </Button>

            {/* Historique des imports */}
            {imports.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Imports récents
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {imports.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{b.filename ?? "Relevé"}</p>
                        <p className="text-xs text-muted-foreground">
                          {frDate(b.created_at)} · {b.count} transaction(s)
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(b)}
                        className="shrink-0 text-muted-foreground hover:text-red-500"
                        aria-label="Annuler cet import"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
