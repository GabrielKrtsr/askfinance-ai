import Link from "next/link";
import { ArrowLeft, Quote } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_20%_0%,hsl(173_80%_40%/0.25),transparent),radial-gradient(60%_60%_at_100%_100%,hsl(243_75%_59%/0.30),transparent)]" />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative max-w-md">
          <Quote className="h-8 w-8 text-teal" />
          <p className="mt-4 text-2xl font-semibold leading-snug">
            « AskFinance AI a transformé notre façon de piloter la trésorerie.
            On a enfin une vision claire, en temps réel. »
          </p>
          <div className="mt-6">
            <p className="font-medium">Léa Fontaine</p>
            <p className="text-sm text-sidebar-muted">DAF, Studio Marbre</p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { v: "+1 200", l: "utilisateurs" },
            { v: "98 %", l: "satisfaction" },
            { v: "2 min", l: "pour démarrer" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-xl font-bold">{s.v}</p>
              <p className="text-xs text-sidebar-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau formulaire */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
