"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatEUR } from "@/lib/utils";
import type { TransactionRow } from "@/lib/data/transactions";
import { ShareToGroupButton } from "@/components/dashboard/share-to-group";

interface TransactionsTableProps {
  transactions: TransactionRow[];
  categories: string[];
  groups?: { id: string; name: string }[];
}

type SortKey = "merchant" | "category" | "amount";

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
  groups = [],
}: TransactionsTableProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesQuery = t.merchant
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory = category === "all" || t.category === category;
      const matchesType = type === "all" || t.type === type;
      const matchesFrom = !from || t.date >= from;
      const matchesTo = !to || t.date <= to;
      return matchesQuery && matchesCategory && matchesType && matchesFrom && matchesTo;
    });
  }, [transactions, query, category, type, from, to]);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "amount" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp =
        sortKey === "amount"
          ? a.amount - b.amount
          : a[sortKey].localeCompare(b[sortKey]);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalIn = filtered
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Nombre de résultats (le titre de page est fourni par la page parente) */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} transaction{filtered.length > 1 ? "s" : ""} affichée
        {filtered.length > 1 ? "s" : ""}
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
                totalIn + totalOut >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              {formatEUR(totalIn + totalOut)}
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
            <Select value={category} onValueChange={setCategory}>
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
            <Select value={type} onValueChange={setType}>
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
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Date de début"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Date de fin"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(from || to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom("");
                  setTo("");
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
              Aucune transaction. Importez un relevé depuis le tableau de bord
              pour commencer.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Aucune transaction ne correspond à vos filtres.
            </div>
          ) : (
            <ul className="divide-y">
              {sorted.map((t) => (
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
                  <div className="md:w-40">
                    <Badge variant="muted">{t.category}</Badge>
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
    </div>
  );
}
