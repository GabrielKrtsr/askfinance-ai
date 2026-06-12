"use client";

import { useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";

import {
  categories,
  formatEUR,
  transactions,
} from "@/lib/mock-data";
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
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesQuery = t.merchant
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory = category === "all" || t.category === category;
      const matchesType = type === "all" || t.type === type;
      return matchesQuery && matchesCategory && matchesType;
    });
  }, [query, category, type]);

  const totalIn = filtered
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} transaction{filtered.length > 1 ? "s" : ""}{" "}
            affichée{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Exporter en CSV
        </Button>
      </div>

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
          <div className="flex items-center gap-3">
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
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          {/* En-tête desktop */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
            <span>Bénéficiaire</span>
            <span className="w-40">Catégorie</span>
            <span className="w-28">Statut</span>
            <span className="w-28 text-right">Montant</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Aucune transaction ne correspond à vos filtres.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((t) => (
                <li
                  key={t.id}
                  className="grid grid-cols-2 gap-3 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[1fr_auto_auto_auto] md:items-center md:gap-4"
                >
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-sm font-medium">{t.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.date} · {t.account} · {t.id}
                    </p>
                  </div>
                  <div className="md:w-40">
                    <Badge variant="muted">{t.category}</Badge>
                  </div>
                  <div className="md:w-28">
                    <Badge
                      variant={t.status === "Validé" ? "success" : "outline"}
                    >
                      {t.status}
                    </Badge>
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
