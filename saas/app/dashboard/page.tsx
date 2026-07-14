import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";

import { getDashboardData, getProfile } from "@/lib/data/dashboard";
import { getCurrentWorkspace, getWorkspaces } from "@/lib/data/workspace";
import { getT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { ImportDialog } from "@/components/dashboard/import-dialog";
import { MonthSelect } from "@/components/dashboard/month-select";
import { AccountSwitcher } from "@/components/dashboard/account-switcher";
import { DetectTransfersButton } from "@/components/dashboard/detect-transfers-button";
import { OpenAiChatButton } from "@/components/dashboard/open-ai-chat-button";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { cn } from "@/lib/utils";

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
  // Un groupe n'a pas de dashboard bancaire : son accueil = les dépenses partagées.
  const workspace = await getCurrentWorkspace();
  if (workspace?.type === "group") redirect("/dashboard/shared");

  const isPerso = workspace?.type === "personal";
  const kind = workspace?.type ?? "business";

  // Groupes de l'utilisateur (pour cliquer une transaction → l'ajouter à un groupe).
  const groups = (await getWorkspaces())
    .filter((w) => w.type === "group")
    .map((w) => ({ id: w.id, name: w.name }));

  const { t, locale } = getT();
  const [profile, data] = await Promise.all([
    getProfile(),
    getDashboardData(searchParams.month, searchParams.account, { t, locale }, kind),
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
            {firstName
              ? t("dashboard.greetingName", { name: firstName })
              : t("dashboard.greeting")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel
              ? t("dashboard.subtitle", { month: monthLabel })
              : t("dashboard.subtitleNoMonth")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccountSwitcher
            accounts={data.accounts}
            selected={data.selectedAccount}
            canDelete={workspace?.role === "owner" || workspace?.role === "admin"}
          />
          {data.months.length > 0 && (
            <MonthSelect months={data.months} selected={data.selectedMonth} />
          )}
          {/* Outil technique réservé au pro (un particulier n'en a pas besoin). */}
          {!isPerso && <DetectTransfersButton workspaceId={workspace?.id ?? ""} />}
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
                {kpi.delta !== "N/D" ? (
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
                  <span className="text-muted-foreground">N/D</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Évolution (vue d'ensemble dans le temps) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("dashboard.categoryTitle")}</CardTitle>
            <CardDescription>
              {monthLabel ?? t("dashboard.thisMonth")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {data.categories.length > 0 ? (
            <CategoryChart data={data.categories} />
          ) : (
            <EmptyState>{t("dashboard.noExpenses")}</EmptyState>
          )}
        </CardContent>
      </Card>

      {isPerso ? (
        /* Perso : transactions récentes (cliquables → groupe), pleine largeur. */
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("dashboard.recentTitle")}</CardTitle>
              <CardDescription>{t("dashboard.recentDesc")}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/transactions">{t("common.seeAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <RecentTransactions items={data.recent} groups={groups} />
          </CardContent>
        </Card>
      ) : (
        /* Pro : répartition par catégorie + récentes + copilote. */
        <>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{t("dashboard.recentTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.recentDesc")}</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/transactions">
                    {t("common.seeAll")}
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <RecentTransactions items={data.recent} groups={groups} />
              </CardContent>
            </Card>

          </div>

          <Card className="flex flex-col bg-gradient-to-br from-primary to-teal text-white">
            <CardHeader>
              <Sparkles className="h-6 w-6" />
              <CardTitle className="text-white">
                {t("dashboard.copilotTitle")}
              </CardTitle>
              <CardDescription className="text-white/80">
                {t("dashboard.copilotSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-end">
              <p className="text-sm text-white/90">{t("dashboard.copilotBody")}</p>
              <OpenAiChatButton />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
