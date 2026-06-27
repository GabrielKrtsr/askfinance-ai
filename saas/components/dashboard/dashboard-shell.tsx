"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Receipt,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { FloatingAiChat } from "@/components/dashboard/floating-ai-chat";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  fullName: string;
  initials: string;
  email: string;
}

const nav = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/dashboard/transactions", icon: Receipt },
];

const secondaryNav = [
  { label: "Comptes", href: "#", icon: CreditCard },
  { label: "Paramètres", href: "#", icon: Settings },
  { label: "Aide", href: "#", icon: LifeBuoy },
];

function SidebarContent({
  user,
  onNavigate,
}: {
  user: DashboardUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Logo variant="light" href="/dashboard" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-muted">
          Navigation
        </p>
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <p className="px-3 pb-2 pt-6 text-xs font-medium uppercase tracking-wider text-sidebar-muted">
          Compte
        </p>
        {secondaryNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Encart upgrade */}
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-gradient-to-br from-primary to-teal p-4">
          <Sparkles className="h-5 w-5 text-white" />
          <p className="mt-2 text-sm font-semibold text-white">Plan Pro</p>
          <p className="mt-0.5 text-xs text-white/80">
            Copilote IA et prévisions activés.
          </p>
        </div>
      </div>

      {/* Utilisateur */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-sm font-semibold text-white">
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sidebar-muted hover:text-white"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Drawer — mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute -right-10 top-4 text-white"
              aria-label="Fermer le menu"
            >
              <X className="h-6 w-6" />
            </button>
            <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher une transaction, une catégorie…"
              className="h-9 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm outline-none focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal ring-2 ring-background" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-sm font-semibold text-white">
              {user.initials}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <FloatingAiChat userInitials={user.initials} />
    </div>
  );
}
