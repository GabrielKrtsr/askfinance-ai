"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
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
}

interface BudgetManagerProps {
  budgets: Budget[];
  categories: string[];
}

export function BudgetManager({ budgets, categories }: BudgetManagerProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // On ne propose que les catégories pas encore budgétées.
  const budgeted = new Set(budgets.map((b) => b.categorie));
  const available = categories.filter((c) => !budgeted.has(c));

  async function handleSave() {
    const value = Number(amount.replace(",", "."));
    if (!category || !Number.isFinite(value) || value <= 0) {
      toast.error("Choisissez une catégorie et un montant valide.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: user.id, category, amount: value },
        { onConflict: "user_id,category" }
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

  async function handleDelete(categorie: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("category", categorie);
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
            Vos dépenses par rapport à vos budgets
          </CardDescription>
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
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
            return (
              <div key={b.categorie} className="group">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{b.categorie}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "tabular-nums",
                        over ? "text-red-500" : "text-muted-foreground"
                      )}
                    >
                      {formatEUR(b.depense)} / {formatEUR(b.budget)}
                    </span>
                    <button
                      onClick={() => handleDelete(b.categorie)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      aria-label={`Supprimer le budget ${b.categorie}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
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
