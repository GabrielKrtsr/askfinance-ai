"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

type Theme = "light" | "dark" | "system";

// Applique le thème à <html> (classe .dark lue par Tailwind).
function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function SettingsPanel({
  user,
}: {
  user: { fullName: string; email: string };
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme((localStorage.getItem("theme") as Theme) ?? "light");
  }, []);

  // Thème : stocké en localStorage (préférence d'appareil).
  function chooseTheme(value: Theme) {
    setTheme(value);
    localStorage.setItem("theme", value);
    applyTheme(value);
  }

  // Langue : stockée en cookie `locale` (lisible côté serveur) → refresh pour
  // re-rendre les Server Components dans la nouvelle langue.
  function chooseLang(value: Locale) {
    if (value === locale) return;
    document.cookie = `locale=${value}; path=/; max-age=31536000; samesite=lax`;
    toast.success(t("settings.langSaved"));
    router.refresh();
  }

  async function handleSignOut() {
    await logout();
    // Rechargement complet → repart d'une session propre (vide le cache RSC/router).
    window.location.href = "/login";
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: t("settings.themeLight"), icon: Sun },
    { value: "dark", label: t("settings.themeDark"), icon: Moon },
    { value: "system", label: t("settings.themeSystem"), icon: Monitor },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Apparence / thème */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance")}</CardTitle>
          <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => chooseTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted"
                  )}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Langue */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {locales.map((l) => {
            const active = locale === l;
            return (
              <button
                key={l}
                onClick={() => chooseLang(l)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input hover:bg-muted"
                )}
              >
                <Globe className="h-4 w-4" />
                {localeNames[l]}
                {active && <Check className="ml-auto h-4 w-4" />}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
          <CardDescription>{t("settings.profileDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.fullName || "Non renseigné"}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compte */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account")}</CardTitle>
          <CardDescription>{t("settings.accountDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
