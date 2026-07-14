import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AskFinance AI | Comprendre aujourd’hui, décider demain",
  description:
    "Budgets, dépenses partagées et pilotage de trésorerie avec des espaces Solo, Groupe et Entreprise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getLocale();
  const messages = getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Applique le thème enregistré avant le rendu (évite le flash clair/sombre). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme')||'light';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}",
          }}
        />
        <I18nProvider locale={locale} messages={messages}>{children}</I18nProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
