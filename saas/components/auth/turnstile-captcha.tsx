"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      appearance?: "always" | "execute" | "interaction-only";
      language?: string;
      retry?: "auto" | "never";
      callback: (token: string) => void;
      "error-callback": () => boolean | void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

type TurnstileAppearance = "always" | "execute" | "interaction-only";

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const captchaCopy = {
  fr: {
    title: "Vérification anti-robot",
    loading: "Chargement du contrôle sécurisé",
    missing: "Le contrôle anti-robot n'est pas configuré sur cet environnement.",
    failed: "Le contrôle anti-robot n'a pas pu être chargé. Réessayez.",
  },
  en: {
    title: "Anti-bot verification",
    loading: "Loading secure verification",
    missing: "Anti-bot verification is not configured in this environment.",
    failed: "Anti-bot verification could not be loaded. Please try again.",
  },
  uk: {
    title: "Перевірка проти роботів",
    loading: "Завантаження безпечної перевірки",
    missing: "Перевірку проти роботів не налаштовано в цьому середовищі.",
    failed: "Не вдалося завантажити перевірку проти роботів. Спробуйте ще раз.",
  },
} as const;

export function TurnstileCaptcha({
  siteKey,
  language,
  resetKey,
  appearance = "always",
  onToken,
  onError,
}: {
  siteKey: string;
  language: string;
  resetKey: number;
  appearance?: TurnstileAppearance;
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const copy = captchaCopy[language as keyof typeof captchaCopy] ?? captchaCopy.fr;
  const isInteractionOnly = appearance === "interaction-only";

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onError, onToken]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      size: "flexible",
      appearance,
      language,
      retry: "auto",
      callback: (token) => onTokenRef.current(token),
      "error-callback": () => {
        onTokenRef.current(null);
        onErrorRef.current();
        return true;
      },
      "expired-callback": () => onTokenRef.current(null),
      "timeout-callback": () => onTokenRef.current(null),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [appearance, language, scriptReady, siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  if (!siteKey) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{copy.missing}</p>
      </div>
    );
  }

  return (
    <div
      className={
        isInteractionOnly
          ? "min-h-0 min-w-0 overflow-hidden"
          : "min-w-0 overflow-hidden rounded-xl border bg-muted/20 p-2 sm:p-3"
      }
    >
      {!isInteractionOnly && (
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-teal" />
          {copy.title}
        </div>
      )}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          setScriptFailed(false);
          setScriptReady(true);
        }}
        onError={() => {
          setScriptFailed(true);
          onErrorRef.current();
        }}
      />
      {!scriptReady && !scriptFailed && (
        <div
          className={
            isInteractionOnly
              ? "flex h-6 items-center justify-center text-xs text-muted-foreground"
              : "flex min-h-16 items-center justify-center text-xs text-muted-foreground"
          }
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {copy.loading}
        </div>
      )}
      {scriptFailed && (
        <div className="flex min-h-16 items-center justify-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" /> {copy.failed}
        </div>
      )}
      <div
        ref={containerRef}
        className={
          scriptReady && !isInteractionOnly
            ? "min-h-16 w-full min-w-0"
            : scriptReady
              ? "w-full min-w-0"
              : "hidden"
        }
      />
    </div>
  );
}
