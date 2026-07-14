"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatEUR } from "@/lib/utils";

interface Budget {
  categorie: string;
  depense: number;
  budget: number;
  month: string;
}

interface BudgetManagerProps {
  budgets: Budget[];
  categories: string[];
  workspaceId: string;
  month: string;
  monthLabel?: string;
  canEdit?: boolean;
}

function monthDate(month: string) {
  return `${month}-01`;
}

function previousMonthDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function BudgetManager({
  budgets,
  categories,
  workspaceId,
  month,
  monthLabel,
  canEdit = true,
}: BudgetManagerProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");

  // On ne propose que les catégories pas encore budgétées.
  const budgeted = new Set(budgets.map((b) => b.categorie));
  const available = categories.filter((c) => !budgeted.has(c));

  async function handleSave() {
    const value = Number(amount.replace(",", "."));
    if (!month) {
      toast.error("Choisissez d'abord un mois.");
      return;
    }
    if (!category || !Number.isFinite(value) || value <= 0) {
      toast.error("Choisissez une catégorie et un montant valide.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("budgets")
      .upsert(
        {
          workspace_id: workspaceId,
          category,
          month: monthDate(month),
          amount: value,
        },
        { onConflict: "workspace_id,category,month" }
      );
    setSaving(false);

    if (error) {
      toast.error("Impossible d'enregistrer le budget", {
        description: error.message,
      });
      return;
    }
    toast.success("Budget enregistré");
    setAdding(false);
    setCategory("");
    setAmount("");
    router.refresh();
  }

  async function handleUpdate() {
    if (!editingCategory || !month) return;
    const value = Number(editingAmount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Saisissez un montant valide.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("budgets")
      .update({ amount: value })
      .eq("workspace_id", workspaceId)
      .eq("category", editingCategory)
      .eq("month", monthDate(month));
    setSaving(false);

    if (error) {
      toast.error("Modification impossible", { description: error.message });
      return;
    }
    toast.success("Budget modifié");
    setEditingCategory(null);
    setEditingAmount("");
    router.refresh();
  }

  async function handleCopyPreviousMonth() {
    if (!month) return toast.error("Choisissez d'abord un mois.");
    setCopying(true);
    const supabase = createClient();
    const previousMonth = previousMonthDate(month);
    const { data, error } = await supabase
      .from("budgets")
      .select("category, amount")
      .eq("workspace_id", workspaceId)
      .eq("month", previousMonth);

    if (error) {
      setCopying(false);
      toast.error("Impossible de charger le mois précédent", {
        description: error.message,
      });
      return;
    }

    const existingCategories = new Set(budgets.map((budget) => budget.categorie));
    const rows = (data ?? [])
      .filter((budget) => !existingCategories.has(budget.category))
      .map((budget) => ({
        workspace_id: workspaceId,
        category: budget.category,
        month: monthDate(month),
        amount: budget.amount,
      }));

    if (rows.length === 0) {
      setCopying(false);
      toast.info("Aucun budget à reprendre du mois précédent.");
      return;
    }

    const { error: copyError } = await supabase
      .from("budgets")
      .upsert(rows, { onConflict: "workspace_id,category,month" });
    setCopying(false);

    if (copyError) {
      toast.error("Copie impossible", { description: copyError.message });
      return;
    }
    toast.success(`${rows.length} budget(s) repris du mois précédent`);
    router.refresh();
  }

  async function handleDelete(categorie: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("category", categorie)
      .eq("month", monthDate(month));
    if (error) {
      toast.error("Suppression impossible", { description: error.message });
      return;
    }
    toast.success("Budget supprimé");
    router.refresh();
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Suivi budgétaire</CardTitle>
          <CardDescription>
            Vos dépenses par rapport aux budgets de {monthLabel ?? month}
          </CardDescription>
        </div>
        {canEdit && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPreviousMonth}
              disabled={copying || !month}
            >
              {copying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Reprendre le mois précédent
            </Button>
            {!adding && (
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Formulaire d'ajout */}
        {adding && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Catégorie
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Toutes vos catégories ont déjà un budget.
                    </div>
                  ) : (
                    available.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:w-32">
              <label className="text-xs font-medium text-muted-foreground">
                Budget (€)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Liste des budgets */}
        {budgets.length > 0 ? (
          budgets.map((b) => {
            const pct =
              b.budget > 0 ? Math.round((b.depense / b.budget) * 100) : 0;
            const over = b.depense > b.budget;
            const editing = editingCategory === b.categorie;
            return (
              <div key={b.categorie} className="group">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{b.categorie}</span>
                  <div className="flex items-center gap-2">
                    {editing ? (
                      <>
                        <Input
                          className="h-8 w-28"
                          type="number"
                          inputMode="decimal"
                          value={editingAmount}
                          onChange={(event) => setEditingAmount(event.target.value)}
                          aria-label={`Nouveau budget ${b.categorie}`}
                        />
                        <button
                          onClick={handleUpdate}
                          disabled={saving}
                          className="text-emerald-600 disabled:opacity-50"
                          aria-label={`Enregistrer le budget ${b.categorie}`}
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="text-muted-foreground"
                          aria-label="Annuler la modification"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "tabular-nums",
                            over ? "text-red-500" : "text-muted-foreground"
                          )}
                        >
                          {formatEUR(b.depense)} / {formatEUR(b.budget)}
                        </span>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCategory(b.categorie);
                                setEditingAmount(String(b.budget));
                              }}
                              className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                              aria-label={`Modifier le budget ${b.categorie}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(b.categorie)}
                              className="text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                              aria-label={`Supprimer le budget ${b.categorie}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <Progress
                  value={Math.min(pct, 100)}
                  indicatorClassName={cn(over ? "bg-red-500" : "bg-teal")}
                />
              </div>
            );
          })
        ) : (
          !adding && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun budget défini. Cliquez sur « Ajouter » pour en créer un.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
