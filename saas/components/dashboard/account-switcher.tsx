"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAccount,
  deleteAccount,
  getAccountBalanceDetails,
  getAccountDeletionImpact,
  updateAccountCurrentBalance,
} from "@/lib/services/accounts";
import type { AccountOption } from "@/lib/data/dashboard";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

type AccountDeletionImpact = Awaited<ReturnType<typeof getAccountDeletionImpact>>;

export function AccountSwitcher({
  accounts,
  selected,
  canEdit,
  canDelete,
}: {
  accounts: AccountOption[];
  selected: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const pathname = usePathname();
  const params = useSearchParams();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountOption | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<AccountDeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [editingBalance, setEditingBalance] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceAccountName, setBalanceAccountName] = useState("");
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [nextBalance, setNextBalance] = useState("");

  const selectedLabel =
    selected === "all"
      ? copy.account.all
      : accounts.find((account) => account.value === selected)?.label ?? copy.account.account;

  function navigate(account: string) {
    setAccountMenuOpen(false);
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("account", account);
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const account = await createAccount(
        name.trim(),
        Number(opening.replace(",", ".")) || 0
      );
      if (!account) return;
      setAdding(false);
      setName("");
      setOpening("");
      navigate(account.id);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.account.createFailed);
    } finally {
      setSaving(false);
    }
  }

  async function openDeleteDialog(account: AccountOption) {
    setAccountMenuOpen(false);
    setDeleteTarget(account);
    setDeletionImpact(null);
    setDeleteConfirmation("");
    setLoadingImpact(true);
    try {
      setDeletionImpact(await getAccountDeletionImpact(account.value));
    } catch (error) {
      setDeleteTarget(null);
      toast.error(error instanceof Error ? error.message : copy.account.readFailed);
    } finally {
      setLoadingImpact(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !deletionImpact) return;
    if (deleteConfirmation.trim() !== deletionImpact.name) return;

    setDeleting(true);
    try {
      await deleteAccount(deleteTarget.value, deleteConfirmation.trim());
      toast.success(copy.account.deleted(deletionImpact.name));
      const deletedSelectedAccount = selected === deleteTarget.value;
      setDeleteTarget(null);
      setDeletionImpact(null);
      setDeleteConfirmation("");
      if (deletedSelectedAccount) navigate("all");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.account.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  async function openBalanceEditor() {
    if (selected === "all") return;
    setLoadingBalance(true);
    try {
      const details = await getAccountBalanceDetails(selected);
      setBalanceAccountName(details.name);
      setCurrentBalance(details.currentBalance);
      setNextBalance(details.currentBalance.toFixed(2).replace(".", ","));
      setEditingBalance(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.account.balanceReadFailed);
    } finally {
      setLoadingBalance(false);
    }
  }

  async function handleBalanceUpdate() {
    const normalized = nextBalance.trim().replace(/\s/g, "").replace(",", ".");
    if (!normalized) return toast.error(copy.account.enterBalance);
    const value = Number(normalized);
    if (!Number.isFinite(value)) return toast.error(copy.account.invalidBalance);

    setSaving(true);
    try {
      const result = await updateAccountCurrentBalance(selected, value);
      setEditingBalance(false);
      setCurrentBalance(result.currentBalance);
      toast.success(copy.account.balanceUpdated);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.account.updateFailed);
    } finally {
      setSaving(false);
    }
  }

  if (adding) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={copy.account.name}
          className="h-9 w-36"
        />
        <Input
          value={opening}
          onChange={(event) => setOpening(event.target.value)}
          placeholder={copy.account.balance}
          inputMode="decimal"
          className="h-9 w-24"
        />
        <Button size="sm" onClick={handleCreate} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.common.create}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
          {copy.common.cancel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setAccountMenuOpen((open) => !open)}
          className="flex h-9 w-[190px] items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm shadow-sm transition-colors hover:bg-muted"
          aria-expanded={accountMenuOpen}
          aria-haspopup="listbox"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {accountMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label={copy.account.closeList}
              onClick={() => setAccountMenuOpen(false)}
            />
            <div
              className="absolute left-0 z-50 mt-1.5 w-64 overflow-hidden rounded-lg border bg-card p-1 shadow-lg"
              role="listbox"
              aria-label={copy.account.accounts}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected === "all"}
                onClick={() => navigate("all")}
                className={
                  selected === "all"
                    ? "flex w-full items-center gap-2 rounded-md bg-primary/10 px-2 py-2 text-sm text-primary"
                    : "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                }
              >
                <span className="min-w-0 flex-1 truncate text-left">{copy.account.all}</span>
                {selected === "all" && <Check className="h-4 w-4 shrink-0" />}
              </button>

              <div className="my-1 h-px bg-border" />

              {accounts.map((account) => {
                const active = selected === account.value;
                return (
                  <div
                    key={account.value}
                    className={
                      active
                        ? "group flex items-center rounded-md bg-primary/10 text-primary"
                        : "group flex items-center rounded-md transition-colors hover:bg-muted"
                    }
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => navigate(account.value)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate text-left">{account.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => openDeleteDialog(account)}
                        className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-background hover:text-red-600 hover:opacity-100 disabled:opacity-40"
                        aria-label={copy.account.deleteNamed(account.label)}
                        title={copy.account.deleteAccount}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAccountMenuOpen(false);
            setAdding(true);
          }}
          aria-label={copy.account.newAccount}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          disabled={loadingBalance || selected === "all"}
          onClick={openBalanceEditor}
          aria-label={copy.account.editSelectedBalance}
          title={selected === "all" ? copy.account.selectToEdit : copy.account.editBalance}
        >
          {loadingBalance ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </Button>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={copy.common.close}
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40">
                <Trash2 className="h-5 w-5" />
              </div>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                aria-label={copy.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-5 text-xl font-bold tracking-tight">{copy.account.deleteTitle}</h2>

            {loadingImpact ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.account.calculating}
              </div>
            ) : deletionImpact ? (
              <>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {copy.account.deleteImpact(deletionImpact.name, deletionImpact.transactions, deletionImpact.imports)}
                </p>
                <div className="mt-5 space-y-2">
                  <label htmlFor="account-delete-confirmation" className="text-sm font-medium">
                    {copy.account.typeToConfirm.replace("{name}", deletionImpact.name)}
                  </label>
                  <Input
                    id="account-delete-confirmation"
                    autoFocus
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        deleteConfirmation.trim() === deletionImpact.name &&
                        !deleting
                      ) {
                        handleDelete();
                      }
                    }}
                  />
                </div>
              </>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                {copy.common.cancel}
              </Button>
              <Button
                variant="destructive"
                disabled={
                  deleting ||
                  loadingImpact ||
                  !deletionImpact ||
                  deleteConfirmation.trim() !== deletionImpact.name
                }
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {copy.account.deleteForever}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={copy.common.close}
            onClick={() => !saving && setEditingBalance(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{copy.account.adjustBalance}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{balanceAccountName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBalance(false)}
                disabled={saving}
                className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                aria-label={copy.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
              {copy.account.calculatedBalance}{" "}
              <strong className="text-foreground">
                {currentBalance?.toLocaleString(locale === "fr" ? "fr-FR" : locale === "uk" ? "uk-UA" : "en-GB", {
                  style: "currency",
                  currency: "EUR",
                })}
              </strong>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="account-current-balance" className="text-sm font-medium">
                {copy.account.bankBalance}
              </label>
              <div className="relative">
                <Input
                  id="account-current-balance"
                  autoFocus
                  value={nextBalance}
                  onChange={(event) => setNextBalance(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !saving) handleBalanceUpdate();
                  }}
                  inputMode="decimal"
                  className="pr-10 text-lg font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  €
                </span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.account.balanceHint}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" disabled={saving} onClick={() => setEditingBalance(false)}>
                {copy.common.cancel}
              </Button>
              <Button disabled={saving || !nextBalance.trim()} onClick={handleBalanceUpdate}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {copy.account.saveBalance}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
