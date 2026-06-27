import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download, Sparkles } from "lucide-react";

import { getDashboardData, getProfile } from "@/lib/data/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { ImportDialog } from "@/components/dashboard/import-dialog";
import { BudgetManager } from "@/components/dashboard/budget-manager";
import { RecurringCharges } from "@/components/dashboard/recurring-charges";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { ReceivablesRadar } from "@/components/dashboard/receivables-radar";
import { TaxVault } from "@/components/dashboard/tax-vault";
import { EInvoiceReadiness } from "@/components/dashboard/einvoice-readiness";
import { MonthSelect } from "@/components/dashboard/month-select";
import { AccountSwitcher } from "@/components/dashboard/account-switcher";
import { DetectTransfersButton } from "@/components/dashboard/detect-transfers-button";
import { OpenAiChatButton } from "@/components/dashboard/open-ai-chat-button";
import { cn, formatEUR } from "@/lib/utils";

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-center text-sm text-muted-foreground">
      <p>{children}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; account?: string };
}) {
  const [profile, data] = await Promise.all([
    getProfile(),
    getDashboardData(searchParams.month, searchParams.account),
  ]);
  const firstName = profile?.firstName || profile?.fullName || "";
  const monthLabel = data.months.find(
    (m) => m.value === data.selectedMonth
  )?.label;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Voici l'état de vos finances
            {monthLabel ? ` — ${monthLabel}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccountSwitcher
            accounts={data.accounts}
            selected={data.selectedAccount}
          />
          {data.months.length > 0 && (
            <MonthSelect months={data.months} selected={data.selectedMonth} />
          )}
          <DetectTransfersButton />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <ImportDialog />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight">
                {kpi.value}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                {kpi.delta !== "—" ? (
                  <>
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 font-medium",
                        kpi.positive ? "text-emerald-600" : "text-red-500"
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
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trésorerie prévisionnelle */}
      <ForecastChart />

      {/* Récupérer le cash (encaissements) + ne pas être surpris (fiscal) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ReceivablesRadar />
        <TaxVault />
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
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
            {data.cashflow.length > 0 ? (
              <CashflowChart data={data.cashflow} />
            ) : (
              <EmptyState>
                Aucune donnée à afficher. Importez un relevé pour voir vos flux.
              </EmptyState>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
            <CardDescription>{monthLabel ?? "Mois en cours"}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categories.length > 0 ? (
              <CategoryChart data={data.categories} />
            ) : (
              <EmptyState>Aucune dépense ce mois-ci.</EmptyState>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budgets + Copilote */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BudgetManager
          budgets={data.budgets}
          categories={data.availableCategories}
        />

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
              Posez vos questions et obtenez des analyses sur mesure.
            </p>
            <OpenAiChatButton />
          </CardContent>
        </Card>
      </div>

      {/* Charges récurrentes */}
      <RecurringCharges />

      {/* Préparation à la facture électronique 2026/2027 */}
      <EInvoiceReadiness />

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
          {data.recent.length > 0 ? (
            <ul className="divide-y">
              {data.recent.map((t) => (
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
                    <p className="text-xs text-muted-foreground">{t.dateLabel}</p>
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
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aucune transaction. Importez un relevé pour commencer.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
