import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  Landmark,
  Sparkles,
} from "lucide-react";

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
  if (!workspace) redirect("/onboarding");
  if (workspace.type === "group") redirect("/dashboard/shared");

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

  if (workspace.onboardingStatus === "pending" && !data.hasData) {
    redirect("/onboarding");
  }

  if (!data.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {firstName
                ? t("dashboard.greetingName", { name: firstName })
                : t("dashboard.greeting")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.subtitleNoMonth")}
            </p>
          </div>
          {data.accounts.length > 0 && (
            <AccountSwitcher
              accounts={data.accounts}
              selected={data.selectedAccount}
              canEdit={workspace.role !== "viewer"}
              canDelete={workspace.role === "owner" || workspace.role === "admin"}
            />
          )}
        </div>

        <Card className="overflow-hidden border-primary/15">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t("dashboard.emptyEyebrow")}
              </span>
              <h2 className="mt-5 max-w-xl text-3xl font-bold tracking-tight">
                {t(isPerso ? "dashboard.emptyTitlePerso" : "dashboard.emptyTitle")}
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                {t(isPerso ? "dashboard.emptyBodyPerso" : "dashboard.emptyBody")}
              </p>
              <ImportDialog
                triggerLabel={t("dashboard.emptyAction")}
                triggerSize="lg"
                triggerClassName="mt-7"
              />
            </div>

            <div className="border-t bg-muted/35 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <p className="text-sm font-semibold">{t("dashboard.emptySteps")}</p>
              <div className="mt-6 space-y-5">
                <SetupLine icon={<Landmark />} number="1" text={t("dashboard.emptyAccount")} />
                <SetupLine icon={<FileSpreadsheet />} number="2" text={t("dashboard.emptyImport")} />
                <SetupLine icon={<Check />} number="3" text={t("dashboard.emptyResult")} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
            canEdit={workspace.role !== "viewer"}
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
                  <span className="text-muted-foreground">{t("dashboard.notAvailable")}</span>
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

function SetupLine({
  icon,
  number,
  text,
}: {
  icon: React.ReactNode;
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm [&_svg]:h-5 [&_svg]:w-5">
        {icon}
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {number}
        </span>
      </span>
      <p className="text-sm font-medium leading-5">{text}</p>
    </div>
  );
}
