import type { ReactNode } from "react";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-site flex min-h-screen flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
