"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Check,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatEUR } from "@/lib/utils";
import type {
  TransactionFilters,
  TransactionRow,
  TransactionSort,
} from "@/lib/data/transactions";
import { ShareToGroupButton } from "@/components/dashboard/share-to-group";
import { updateTransactionCategory } from "@/lib/actions/transaction-categories";

interface TransactionsTableProps {
  transactions: TransactionRow[];
  categories: string[];
  filters: TransactionFilters;
  total: number;
  page: number;
  pageCount: number;
  totalIn: number;
  totalOut: number;
  net: number;
  groups?: { id: string; name: string }[];
}

type SortKey = Exclude<TransactionSort, "date">;

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortKey === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground",
        align === "right" && "justify-end",
        className
      )}
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export function TransactionsTable({
  transactions,
  categories,
  filters,
  total,
  page,
  pageCount,
  totalIn,
  totalOut,
  net,
  groups = [],
}: TransactionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.query ?? "");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategory, setEditedCategory] = useState("");
  const [applyCategoryRule, setApplyCategoryRule] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const sortKey = filters.sort && filters.sort !== "date" ? filters.sort : null;
  const sortDir = filters.direction ?? "desc";

  async function saveCategory(transactionId: string) {
    if (!editedCategory.trim()) return;
    setSavingCategory(true);
    try {
      await updateTransactionCategory({
        transactionId,
        category: editedCategory,
        applyToMerchant: applyCategoryRule,
      });
      toast.success(
        applyCategoryRule
          ? "Catégorie enregistrée et règle créée"
          : "Catégorie enregistrée"
      );
      setEditingCategoryId(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modification impossible.");
    } finally {
      setSavingCategory(false);
    }
  }

  const updateParams = useCallback((changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!("page" in changes)) params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }, [pathname, router]);

  useEffect(() => setQuery(filters.query ?? ""), [filters.query]);
  useEffect(() => {
    if (query === (filters.query ?? "")) return;
    const timer = window.setTimeout(
      () => updateParams({ q: query.trim() || undefined }),
      350
    );
    return () => window.clearTimeout(timer);
  }, [filters.query, query, updateParams]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      updateParams({ sort: key, dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: key === "amount" ? "desc" : "asc" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Nombre de résultats (le titre de page est fourni par la page parente) */}
      <p className="text-sm text-muted-foreground">
        {total} transaction{total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
        {isPending ? " · Actualisation…" : ""}
      </p>

      {/* Récap */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Entrées</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              +{formatEUR(totalIn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sorties</p>
            <p className="mt-1 text-xl font-bold">{formatEUR(totalOut)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Solde net</p>
            <p
              className={cn(
                "mt-1 text-xl font-bold",
                net >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              {formatEUR(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un bénéficiaire…"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.category ?? "all"}
              onValueChange={(value) => updateParams({ category: value === "all" ? undefined : value })}
            >
              <SelectTrigger className="w-[180px]">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.type ?? "all"}
              onValueChange={(value) => updateParams({ type: value === "all" ? undefined : value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="credit">Entrées</SelectItem>
                <SelectItem value="debit">Sorties</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filters.from ?? ""}
                onChange={(e) => updateParams({ from: e.target.value || undefined })}
                aria-label="Date de début"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">→</span>
              <input
                type="date"
                value={filters.to ?? ""}
                onChange={(e) => updateParams({ to: e.target.value || undefined })}
                aria-label="Date de fin"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(filters.from || filters.to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateParams({ from: undefined, to: undefined });
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          {/* En-tête desktop */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b px-6 py-3 text-xs font-medium text-muted-foreground md:grid">
            <SortHeader
              label="Bénéficiaire"
              column="merchant"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
            <SortHeader
              label="Catégorie"
              column="category"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              className="w-40"
            />
            <div className="w-28 uppercase tracking-wider">
              {groups.length > 0 ? "Groupe" : ""}
            </div>
            <SortHeader
              label="Montant"
              column="amount"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              align="right"
              className="w-28"
            />
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {filters.query || filters.category || filters.type || filters.from || filters.to
                ? "Aucune transaction ne correspond à vos filtres."
                : "Aucune transaction. Importez un relevé depuis le tableau de bord pour commencer."}
            </div>
          ) : (
            <ul className="divide-y">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="grid grid-cols-2 gap-3 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[1fr_auto_auto_auto] md:items-center md:gap-4"
                >
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-sm font-medium">{t.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.dateLabel}
                      {t.account ? ` · ${t.account}` : ""}
                    </p>
                  </div>
                  <div className="md:w-56">
                    {editingCategoryId === t.id ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <Input
                            value={editedCategory}
                            onChange={(event) => setEditedCategory(event.target.value)}
                            list="transaction-category-options"
                            className="h-8 min-w-0"
                            autoFocus
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveCategory(t.id);
                              if (event.key === "Escape") setEditingCategoryId(null);
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={savingCategory}
                            onClick={() => saveCategory(t.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingCategoryId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={applyCategoryRule}
                            onChange={(event) => setApplyCategoryRule(event.target.checked)}
                          />
                          Appliquer à ce libellé à l’avenir
                        </label>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="group/category inline-flex items-center gap-1"
                        onClick={() => {
                          setEditingCategoryId(t.id);
                          setEditedCategory(t.category);
                          setApplyCategoryRule(true);
                        }}
                        title="Modifier la catégorie"
                      >
                        <Badge variant="muted">{t.category}</Badge>
                        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover/category:opacity-60" />
                      </button>
                    )}
                  </div>
                  <div className="md:w-28">
                    {t.type === "debit" && groups.length > 0 ? (
                      <ShareToGroupButton transactionId={t.id} groups={groups} />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "text-right text-sm font-semibold tabular-nums md:w-28",
                      t.type === "credit"
                        ? "text-emerald-600"
                        : "text-foreground"
                    )}
                  >
                    {t.type === "credit" ? "+" : ""}
                    {formatEUR(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={page <= 1 || isPending}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            Précédent
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} sur {pageCount}
          </p>
          <Button
            variant="outline"
            disabled={page >= pageCount || isPending}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Suivant
          </Button>
        </div>
      )}
      <datalist id="transaction-category-options">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </div>
  );
}
