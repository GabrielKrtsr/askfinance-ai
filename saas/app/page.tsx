import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Import CSV en un clic",
    desc: "Glissez vos relevés bancaires, nous catégorisons automatiquement chaque transaction.",
  },
  {
    icon: BarChart3,
    title: "Tableaux de bord clairs",
    desc: "Solde, dépenses par catégorie, taux d'épargne — tout est visualisé en temps réel.",
  },
  {
    icon: Bot,
    title: "Copilote IA",
    desc: "Posez vos questions en langage naturel et obtenez des analyses instantanées.",
  },
  {
    icon: Wallet,
    title: "Suivi budgétaire",
    desc: "Fixez des budgets par poste et recevez une alerte avant le dépassement.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité bancaire",
    desc: "Chiffrement de bout en bout et hébergement des données en France.",
  },
  {
    icon: Sparkles,
    title: "Prévisions",
    desc: "Anticipez votre budget à 3 mois grâce aux modèles prédictifs.",
  },
];

const plans = [
  {
    name: "Gratuit",
    price: "0",
    cadence: "/mois",
    desc: "Pour suivre vos comptes sans payer.",
    cta: "Commencer gratuitement",
    highlighted: false,
    features: [
      "1 compte bancaire",
      "Import CSV illimité",
      "Tableau de bord de base",
      "30 jours d'historique",
    ],
  },
  {
    name: "Premium",
    price: "9",
    cadence: "/mois",
    desc: "Pour gérer votre argent au quotidien.",
    cta: "Démarrer l'essai",
    highlighted: true,
    features: [
      "Comptes illimités",
      "Copilote IA illimité",
      "Budgets & alertes",
      "Prévisions à 3 mois",
      "Historique illimité",
    ],
  },
];

const testimonials = [
  {
    quote:
      "Je vois enfin clair dans mon budget. Importer mes relevés m'a pris deux minutes, et le copilote répond à toutes mes questions.",
    name: "Karim Benali",
    role: "Particulier, Lyon",
  },
  {
    quote:
      "Le copilote a repéré trois abonnements que j'avais oubliés. J'économise une quarantaine d'euros par mois sans avoir rien fait.",
    name: "Camille Moreau",
    role: "Particulier, Lille",
  },
  {
    quote:
      "Les alertes de budget m'évitent les mauvaises surprises en fin de mois. Je sais toujours où j'en suis.",
    name: "Sophie Renaud",
    role: "Particulier, Bordeaux",
  },
];

const trust = [
  "Chiffrement de bout en bout",
  "Données hébergées en France",
  "Sans engagement",
  "Vos données jamais revendues",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(243_75%_59%/0.10),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="teal" className="mb-5">
                <Sparkles className="mr-1 h-3 w-3" />
                Nouveau · Copilote financier par IA
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Vos finances personnelles, enfin claires
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
                Importez vos relevés, visualisez vos dépenses et discutez avec
                une IA qui comprend votre argent. La gestion de budget, enfin
                simple.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Démarrer gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard">Voir une démo</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Sans carte bancaire · Configuration en 2 minutes
              </p>
            </div>

            {/* Aperçu produit */}
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="rounded-2xl border bg-card p-2 shadow-2xl shadow-primary/5">
                <div className="overflow-hidden rounded-xl border bg-gradient-to-b from-muted/50 to-background">
                  <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span className="ml-3 text-xs text-muted-foreground">
                      app.askfinance.ai/dashboard
                    </span>
                  </div>
                  <div className="grid gap-4 p-6 sm:grid-cols-3">
                    {[
                      { l: "Solde total", v: "4 280 €", c: "text-foreground" },
                      { l: "Dépenses", v: "1 940 €", c: "text-foreground" },
                      { l: "Taux d'épargne", v: "32 %", c: "text-teal" },
                    ].map((s) => (
                      <div
                        key={s.l}
                        className="rounded-xl border bg-card p-4 text-left"
                      >
                        <p className="text-xs text-muted-foreground">{s.l}</p>
                        <p className={`mt-1 text-2xl font-bold ${s.c}`}>
                          {s.v}
                        </p>
                      </div>
                    ))}
                    <div className="col-span-full flex h-40 items-end gap-2 rounded-xl border bg-card p-4">
                      {[40, 65, 50, 80, 60, 90, 70, 95, 75, 85, 100, 88].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary"
                            style={{ height: `${h}%` }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Confiance / vie privée */}
        <section className="border-y bg-muted/30 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Conçu pour protéger votre argent et votre vie privée
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-semibold text-muted-foreground/80">
              {trust.map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-teal" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tout ce qu'il faut pour gérer votre argent
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Une application simple, pensée pour suivre votre budget au
                quotidien.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card
                  key={f.title}
                  className="p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Témoignages */}
        <section id="temoignages" className="border-y bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Adopté par des milliers de particuliers
              </h2>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.name} className="flex flex-col p-6">
                  <p className="flex-1 text-sm leading-relaxed text-foreground">
                    « {t.quote} »
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal text-sm font-semibold text-white">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Des tarifs simples et transparents
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Commencez gratuitement, passez au Premium quand vous êtes prêt.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-3xl items-start gap-6 lg:grid-cols-2">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={
                    plan.highlighted
                      ? "relative border-primary shadow-lg ring-1 ring-primary"
                      : "relative"
                  }
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Le plus populaire
                    </Badge>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.desc}
                    </p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight">
                        {`${plan.price} €`}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.cadence}
                      </span>
                    </div>
                    <Button
                      asChild
                      className="mt-6 w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      <Link href="/signup">{plan.cta}</Link>
                    </Button>
                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-teal px-6 py-16 text-center shadow-xl sm:px-16">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Reprenez le contrôle de votre argent
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-balance text-white/85">
                Rejoignez des milliers de particuliers qui gèrent leur budget
                avec sérénité.
              </p>
              <div className="mt-8 flex justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/signup">
                    Créer mon compte gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-4 text-sm text-muted-foreground">
                Le copilote IA de vos finances personnelles.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {[
                {
                  title: "Produit",
                  links: ["Fonctionnalités", "Tarifs", "Sécurité"],
                },
                {
                  title: "Société",
                  links: ["À propos", "Blog", "Carrières"],
                },
                { title: "Légal", links: ["CGU", "Confidentialité", "RGPD"] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="text-sm font-semibold">{col.title}</p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((l) => (
                      <li key={l}>
                        <Link
                          href="#"
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {l}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
            © 2026 AskFinance AI SAS — Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
