import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { PublicPreferences } from "@/components/landing/public-preferences";
import { useI18n } from "@/lib/i18n/client";
import { authCopy } from "@/lib/i18n/auth";
import { publicCommon } from "@/lib/i18n/public";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const copy = authCopy[locale];
  const common = publicCommon[locale];
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Panneau de marque */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_20%_0%,hsl(173_80%_40%/0.25),transparent),radial-gradient(60%_60%_at_100%_100%,hsl(243_75%_59%/0.30),transparent)]" />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative max-w-md">
          <Sparkles className="h-8 w-8 text-teal" />
          <p className="mt-4 text-2xl font-semibold leading-snug">
            {copy.brandTitle}
          </p>
          <p className="mt-4 text-sm leading-6 text-sidebar-muted">{copy.brandText}</p>
        </div>
        <div className="relative text-xs leading-5 text-sidebar-muted">
          {common.version}
        </div>
      </div>

      {/* Panneau formulaire */}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 px-4 py-4 sm:gap-3 sm:p-6">
          <div className="min-w-0 flex-1 lg:hidden">
            <Logo className="[&>span]:hidden min-[440px]:[&>span]:inline" />
          </div>
          <div className="ml-auto shrink-0 lg:ml-0">
            <PublicPreferences
              labels={{ language: common.language, light: common.light, dark: common.dark }}
            />
          </div>
          <Link
            href="/"
            aria-label={copy.back}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.back}</span>
          </Link>
        </div>
        <main className="flex flex-1 items-start justify-center px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:items-center lg:py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
