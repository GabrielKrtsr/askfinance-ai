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
    <div className="grid min-h-screen lg:grid-cols-2">
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
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 p-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto"><PublicPreferences labels={{ language: common.language, light: common.light, dark: common.dark }} /></div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
