import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Plus,
  Sparkles,
} from "lucide-react";

import {
  budgets,
  company,
  formatEUR,
  kpis,
  transactions,
} from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const recent = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {company.user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Voici l'état de vos finances pour juin 2026.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Importer un relevé
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">
                {kpi.value}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    kpi.trend === "up" ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {kpi.trend === "up" ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {kpi.delta}
                </span>
                <span className="text-muted-foreground">{kpi.hint}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Flux de trésorerie</CardTitle>
              <CardDescription>Revenus vs dépenses · 12 mois</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Revenus
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal" />
                Dépenses
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <CashflowChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
            <CardDescription>Juin 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
      </div>

      {/* Budgets + Copilote */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Suivi budgétaire</CardTitle>
            <CardDescription>
              Dépenses par rapport aux budgets fixés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {budgets.map((b) => {
              const pct = Math.round((b.depense / b.budget) * 100);
              const over = b.depense > b.budget;
              return (
                <div key={b.categorie}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{b.categorie}</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        over ? "text-red-500" : "text-muted-foreground"
                      )}
                    >
                      {formatEUR(b.depense)} / {formatEUR(b.budget)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    indicatorClassName={cn(
                      over ? "bg-red-500" : "bg-teal"
                    )}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-gradient-to-br from-primary to-teal text-white">
          <CardHeader>
            <Sparkles className="h-6 w-6" />
            <CardTitle className="text-white">Copilote IA</CardTitle>
            <CardDescription className="text-white/80">
              Une question sur vos finances ?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-end">
            <p className="text-sm text-white/90">
              « Vos dépenses Marketing dépassent de 12 % le budget prévu ce
              mois-ci. »
            </p>
            <Button
              asChild
              variant="secondary"
              className="mt-4 w-full"
            >
              <Link href="/dashboard/chat">Ouvrir le copilote</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transactions récentes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Transactions récentes</CardTitle>
            <CardDescription>Les 6 derniers mouvements</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/transactions">Tout voir</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    t.type === "credit"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {t.type === "credit" ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.merchant}</p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </div>
                <Badge variant="muted" className="hidden sm:inline-flex">
                  {t.category}
                </Badge>
                <span
                  className={cn(
                    "w-24 text-right text-sm font-semibold tabular-nums",
                    t.type === "credit" ? "text-emerald-600" : "text-foreground"
                  )}
                >
                  {t.type === "credit" ? "+" : ""}
                  {formatEUR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
