"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { TurnstileCaptcha } from "@/components/auth/turnstile-captcha";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { authCopy } from "@/lib/i18n/auth";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = authCopy[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!captchaToken) {
      setError(copy.captchaRequired as string);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    setCaptchaToken(null);
    setCaptchaResetKey((value) => value + 1);

    if (error) {
      setError(getAuthErrorMessage(error, locale, "login"));
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(getAuthErrorMessage(error, locale, "login"));
  }

  return (
    <AuthShell>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">{copy.loginTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.loginIntro}
        </p>

        <form className="mt-6 space-y-4 sm:mt-8" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">{copy.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{copy.password}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <TurnstileCaptcha
            siteKey={siteKey}
            language={locale}
            resetKey={captchaResetKey}
            appearance="interaction-only"
            onToken={(token) => {
              setCaptchaToken(token);
              if (token) setError(null);
            }}
            onError={() => {
              setCaptchaToken(null);
              setError(copy.captchaUnavailable as string);
            }}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || !captchaToken || !siteKey}
          >
            {loading ? copy.signingIn : copy.signIn}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{copy.or}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          size="lg"
          type="button"
          onClick={handleGoogle}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
            />
          </svg>
          {copy.google}
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground sm:mt-8">
          {copy.noAccount}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {copy.createAccount}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
