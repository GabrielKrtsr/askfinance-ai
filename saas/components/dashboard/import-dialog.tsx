"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { CsvImportGuide } from "@/components/dashboard/csv-import-guide";
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
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";
import type { Locale } from "@/lib/i18n/config";

function localizedDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : locale === "uk" ? "uk-UA" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ImportDialog({
  triggerLabel,
  triggerSize = "sm",
  triggerClassName,
}: {
  triggerLabel?: string;
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
} = {}) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} ${copy.importDialog.bytes}`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} ${copy.importDialog.kilobytes}`;
    return `${(size / (1024 * 1024)).toLocaleString(locale === "fr" ? "fr-FR" : locale === "uk" ? "uk-UA" : "en-GB", { maximumFractionDigits: 1 })} ${copy.importDialog.megabytes}`;
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [imports, setImports] = useState<ImportBatch[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [newName, setNewName] = useState("");
  const [newOpening, setNewOpening] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  function selectFile(candidate: File | null) {
    if (!candidate) return;

    const isCsv =
      candidate.name.toLowerCase().endsWith(".csv") ||
      candidate.type === "text/csv" ||
      candidate.type === "application/vnd.ms-excel";

    if (!isCsv) {
      toast.error(copy.importDialog.csvOnly);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      toast.error(copy.importDialog.tooLarge);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(candidate);
  }

  function removeFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (importing) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (importing) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!importing) event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (importing) return;
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleImport() {
    // 1. Résoudre le compte cible
    let accountId = selectedAccount;
    if (mode === "new") {
      if (!newName.trim()) return toast.error(copy.importDialog.accountNameRequired);
      const acc = await createAccount(
        newName.trim(),
        Number(newOpening.replace(",", ".")) || 0
      );
      if (!acc) return toast.error(copy.importDialog.accountFailed);
      accountId = acc.id;
    }
    if (!accountId) return toast.error(copy.importDialog.chooseAccount);
    if (!file) return toast.error(copy.importDialog.chooseCsv);

    // 2. Importer
    setImporting(true);
    setImportProgress(0);
    const res = await importTransactionsFromCsv(file, accountId, setImportProgress);
    setImporting(false);
    setImportProgress(0);

    if (res.inserted > 0) {
      const notes: string[] = [];
      if (res.duplicates > 0) notes.push(copy.importDialog.ignored(res.duplicates));
      if (res.skipped > 0) notes.push(copy.importDialog.skipped(res.skipped));
      toast.success(copy.importDialog.imported(res.inserted), {
        description: notes.length ? notes.join(" · ") : undefined,
      });
      removeFile();
      setNewName("");
      setNewOpening("");
      setMode("existing");
      await refreshLists();
      router.refresh();
    } else if (res.duplicates > 0) {
      toast.info(copy.importDialog.noNew, {
        description: copy.importDialog.duplicatesPresent(res.duplicates),
      });
    } else {
      toast.error(copy.importDialog.noneImported, {
        description: res.errors[0] ?? copy.importDialog.checkFormat,
      });
    }
  }

  async function handleCancel(batch: ImportBatch) {
    if (
      !window.confirm(
        copy.importDialog.cancelConfirm(batch.count)
      )
    )
      return;
    const ok = await cancelImport(batch.id);
    if (ok) {
      toast.success(copy.importDialog.cancelled);
      await refreshLists();
      router.refresh();
    } else {
      toast.error(copy.importDialog.cancelFailed);
    }
  }

  return (
    <>
      <Button size={triggerSize} className={triggerClassName} onClick={openDialog}>
        <Plus className="h-4 w-4" />
        {triggerLabel ?? copy.importDialog.title}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{copy.importDialog.title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={copy.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Compte cible */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{copy.importDialog.account}</label>
                <button
                  type="button"
                  onClick={() =>
                    setMode((m) => (m === "existing" ? "new" : "existing"))
                  }
                  className="text-xs font-medium text-primary hover:underline"
                  disabled={accounts.length === 0}
                >
                  {mode === "existing" ? copy.importDialog.newAccount : copy.importDialog.existingAccount}
                </button>
              </div>

              {mode === "existing" ? (
                <Select
                  value={selectedAccount}
                  onValueChange={setSelectedAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={copy.importDialog.accountPlaceholder} />
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
                    placeholder={copy.importDialog.accountName}
                  />
                  <Input
                    value={newOpening}
                    onChange={(e) => setNewOpening(e.target.value)}
                    placeholder={copy.importDialog.openingBalance}
                    inputMode="decimal"
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {/* Fichier */}
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">{copy.importDialog.file}</label>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importing}
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => inputRef.current?.click()}
                  className={`group flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : file
                        ? "border-teal/50 bg-teal/5 hover:border-teal"
                        : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                      isDragging || file
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    }`}
                  >
                    {file ? <FileSpreadsheet className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                  </span>
                  <span className="mt-4 text-sm font-semibold text-foreground">
                    {isDragging
                      ? copy.importDialog.drop
                      : file
                        ? file.name
                        : copy.importDialog.drag}
                  </span>
                  <span className="mt-1 text-xs leading-5 text-muted-foreground">
                    {file
                      ? copy.importDialog.replace(formatFileSize(file.size))
                      : copy.importDialog.select}
                  </span>
                </button>
              </div>
              {file && !importing && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span>{copy.importDialog.ready}</span>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" /> {copy.importDialog.remove}
                  </button>
                </div>
              )}
            </div>

            <CsvImportGuide className="mt-4" />

            <Button
              className="mt-5 w-full"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {importing ? copy.importDialog.importing(importProgress) : copy.importDialog.import}
            </Button>

            {/* Historique des imports */}
            {imports.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {copy.importDialog.recent}
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {imports.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{b.filename ?? copy.importDialog.statement}</p>
                        <p className="text-xs text-muted-foreground">
                          {localizedDate(b.created_at, locale)} · {copy.importDialog.transactions(b.count)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(b)}
                        className="shrink-0 text-muted-foreground hover:text-red-500"
                        aria-label={copy.importDialog.cancelImport}
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
