"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { FloatingAiChat } from "@/components/dashboard/floating-ai-chat";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { logout } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  fullName: string;
  initials: string;
  email: string;
}

type WorkspaceType = "personal" | "business" | "group";

// Menu principal en haut. `modes` = types d'espace où l'item est visible.
type NavItem = { key: string; href: string; icon: typeof LayoutDashboard; modes: WorkspaceType[] };
const nav: NavItem[] = [
  // Perso : 1 section = 1 question (où j'en suis / mes dépenses / mon budget / ce qui arrive)
  { key: "nav.home", href: "/dashboard", icon: LayoutDashboard, modes: ["personal"] },
  { key: "nav.expenses", href: "/dashboard/transactions", icon: Receipt, modes: ["personal"] },
  { key: "nav.budget", href: "/dashboard/budget", icon: PiggyBank, modes: ["personal"] },
  { key: "nav.forecast", href: "/dashboard/pilotage", icon: TrendingUp, modes: ["personal"] },
  // Groupe
  { key: "nav.shared", href: "/dashboard/shared", icon: Wallet, modes: ["group"] },
  // Pro
  { key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, modes: ["business"] },
  { key: "nav.pilotage", href: "/dashboard/pilotage", icon: TrendingUp, modes: ["business"] },
  { key: "nav.fiscal", href: "/dashboard/fiscal", icon: PiggyBank, modes: ["business"] },
  { key: "nav.transactions", href: "/dashboard/transactions", icon: Receipt, modes: ["business"] },
  // Commun (gestion des membres : pro + groupe)
  { key: "nav.members", href: "/dashboard/members", icon: Users, modes: ["business", "group"] },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

export function DashboardShell({
  user,
  workspace,
  workspaces,
  children,
}: {
  user: DashboardUser;
  workspace: { id: string; name: string; type: WorkspaceType };
  workspaces: { id: string; name: string; type: WorkspaceType }[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  // Items visibles selon le type d'espace courant (perso / pro).
  const navItems = nav.filter((item) => item.modes.includes(workspace.type));

  async function handleSignOut() {
    await logout();
    // Rechargement complet → repart d'une session propre (vide le cache RSC/router).
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* En-tête avec le menu en haut */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo href="/dashboard" />

          {/* Sélecteur d'espace : basculer ou en créer un. */}
          <div className="hidden sm:block">
            <WorkspaceSwitcher workspaces={workspaces} current={workspace} />
          </div>

          {/* Menu principal, desktop */}
          <nav className="ml-2 hidden items-center gap-1 md:flex lg:ml-4">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/dashboard/settings"
              aria-label={t("nav.settings")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                isActive(pathname, "/dashboard/settings")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
            </Link>

            <Link
              href={workspace.type === "group" ? "/dashboard/shared" : "/dashboard/pilotage#inbox"}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("nav.notifications")}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal ring-2 ring-background" />
            </Link>

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-sm font-semibold text-white"
              title={user.fullName}
            >
              {user.initials}
            </div>

            <button
              onClick={handleSignOut}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
              aria-label={t("nav.signOut")}
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Menu burger, mobile */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              aria-label={t("nav.openMenu")}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu déroulant, mobile */}
        {mobileOpen && (
          <nav className="space-y-1 border-t bg-background px-4 py-3 md:hidden">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.key)}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("nav.signOut")}
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {workspace.type !== "group" ? (
        <FloatingAiChat userInitials={user.initials} workspaceId={workspace.id} workspaceType={workspace.type} />
      ) : null}
    </div>
  );
}
