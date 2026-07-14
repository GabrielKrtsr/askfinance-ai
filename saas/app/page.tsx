"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BellRing,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  FileSpreadsheet,
  LineChart,
  PiggyBank,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

import { ProductPreview } from "@/components/landing/product-preview";
import { PublicShell } from "@/components/landing/public-shell";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

const perspectiveMeta = [
  [PiggyBank, "/solutions/solo", "from-violet-500/20 to-violet-500/5 text-violet-700 dark:text-violet-200"],
  [Users, "/solutions/group", "from-cyan-500/20 to-cyan-500/5 text-cyan-700 dark:text-cyan-200"],
  [BriefcaseBusiness, "/solutions/business", "from-teal/20 to-teal/5 text-teal-700 dark:text-teal"],
] as const;
const capabilityIcons = [FileSpreadsheet, WalletCards, LineChart, BellRing, ShieldCheck, Bot] as const;

const landingCopy = {
  fr: {
    heroA: "Gardez le contrôle.", heroB: "Trouvez où économiser.", heroText: "AskFinance est le compagnon qui vous aide à comprendre vos finances, réduire les dépenses inutiles et préparer la suite, seul, à plusieurs ou en entreprise.", create: "Créer mon espace", choose: "Choisir mon usage", beta: "Bêta gratuite · Sans carte bancaire · Sans connexion bancaire",
    stripLabel: "Ce qu’AskFinance vous aide à faire", strip: ["Repérez les dépenses inutiles", "Trouvez où économiser", "Gardez le contrôle", "Anticipez les imprévus", "Comprenez vos habitudes", "Suivez vos objectifs", "Préparez vos projets", "Décidez plus sereinement", "Gérez à plusieurs", "Pilotez votre entreprise", "Yassia à vos côtés"], perspectivesEyebrow: "Trois points de vue", perspectivesTitle: "Les mêmes chiffres ne racontent pas la même histoire à tout le monde.", discover: "Découvrir",
    perspectives: [["Personnel", "Mon argent, enfin lisible", "Budgets mensuels, dépenses, solde prévisionnel et coach personnel à partir de vos propres données."], ["Groupe", "Les comptes sans les tensions", "Dépenses partagées, parts personnalisées, soldes entre membres et règlements confirmés ou contestés."], ["Entreprise", "La trésorerie devient pilotable", "Prévisions, encaissements, fiscalité indicative, workflows, audit et copilote IA pour TPE et PME."]],
    chainEyebrow: "Du fichier à l’action", chainTitle: "Une chaîne financière complète, sans boîte noire.", chainText: "Chaque fonctionnalité répond à une étape observable du pilotage.", allFeatures: "Voir toutes les fonctionnalités",
    capabilities: [["Importer sans connecter sa banque", "Vos relevés transitent par un espace privé puis sont supprimés après traitement."], ["Catégoriser et apprendre", "Corrigez une catégorie une fois : la règle est proposée aux imports suivants."], ["Voir plus loin que le solde", "Prévisions à 30, 60 ou 90 jours avec charges récurrentes et scénarios."], ["Traiter ce qui compte", "Une boîte de réception réunit anomalies, budgets, impayés et échéances."], ["Collaborer avec des rôles clairs", "Lecture seule, contribution, administration, validations et journal d’audit."], ["Interroger Yassia", "L’IA appelle uniquement les outils nécessaires et répond à partir de votre espace."]],
    aiEyebrow: "Yassia, copilote IA", aiTitle: "Une question. Trois angles de décision.", aiText: "Yassia ne se contente pas de reformuler vos chiffres. Elle choisit les outils utiles, prépare le contexte puis répond selon votre objectif.", aiLink: "Comprendre le fonctionnement de l’IA", personas: [["Prudence", "Sécuriser", "Repère les tensions, les anomalies et les décisions qui peuvent attendre."], ["Pilotage", "Arbitrer", "Structure le point de gestion, hiérarchise les actions et explique les écarts."], ["Croissance", "Projeter", "Explore la capacité d’investissement et les scénarios de développement."]],
    ctaTitle: "Commencez avec les relevés que vous avez déjà.", ctaText: "Créez votre espace, choisissez votre usage et obtenez une première lecture en quelques minutes.",
  },
  en: {
    heroA: "Stay in control.", heroB: "See where to save.", heroText: "AskFinance is the companion that helps you understand your finances, reduce unnecessary spending and prepare what comes next, personally, as a group or in business.", create: "Create my workspace", choose: "Choose my use case", beta: "Free beta · No payment card · No bank connection",
    stripLabel: "What AskFinance helps you do", strip: ["Spot unnecessary spending", "See where to save", "Stay in control", "Anticipate the unexpected", "Understand your habits", "Track your goals", "Prepare your projects", "Decide with confidence", "Manage money together", "Steer your business", "Keep Yassia by your side"], perspectivesEyebrow: "Three perspectives", perspectivesTitle: "The same numbers do not tell everyone the same story.", discover: "Discover",
    perspectives: [["Personal", "My money, finally clear", "Monthly budgets, spending, forecast balance and a personal coach based on your own data."], ["Group", "Shared accounts without tension", "Shared expenses, custom shares, member balances and confirmed or disputed settlements."], ["Business", "Cash flow you can steer", "Forecasts, receivables, indicative tax, workflows, audit and an AI copilot for small businesses."]],
    chainEyebrow: "From file to action", chainTitle: "A complete financial chain, without a black box.", chainText: "Every feature supports an observable step in financial management.", allFeatures: "See all features",
    capabilities: [["Import without linking your bank", "Your statements pass through private storage and are deleted after processing."], ["Categorize and learn", "Correct a category once and the rule is suggested on future imports."], ["Look beyond the balance", "30, 60 or 90-day forecasts with recurring charges and scenarios."], ["Handle what matters", "One inbox brings together anomalies, budgets, overdue invoices and deadlines."], ["Collaborate with clear roles", "Read-only access, contribution, administration, approvals and an audit log."], ["Ask Yassia", "The AI calls only the tools it needs and answers from your workspace."]],
    aiEyebrow: "Yassia, AI copilot", aiTitle: "One question. Three decision angles.", aiText: "Yassia does more than rephrase your numbers. It selects useful tools, prepares context and answers according to your objective.", aiLink: "See how the AI works", personas: [["Caution", "Protect", "Finds cash pressure, anomalies and decisions that can wait."], ["Management", "Arbitrate", "Structures the review, prioritizes actions and explains variances."], ["Growth", "Project", "Explores investment capacity and growth scenarios."]],
    ctaTitle: "Start with the statements you already have.", ctaText: "Create a workspace, choose your use case and get a first reading in minutes.",
  },
  uk: {
    heroA: "Зберігайте контроль.", heroB: "Знаходьте можливості заощадити.", heroText: "AskFinance є фінансовим помічником, який допомагає розуміти фінанси, скорочувати зайві витрати й готуватися до майбутнього особисто, у групі або в бізнесі.", create: "Створити простір", choose: "Обрати сценарій", beta: "Безкоштовна бета · Без картки · Без підключення банку",
    stripLabel: "Як AskFinance допомагає вам", strip: ["Виявляйте зайві витрати", "Знаходьте можливості заощадити", "Зберігайте контроль", "Передбачайте несподіване", "Розумійте свої звички", "Стежте за цілями", "Готуйте свої проєкти", "Ухвалюйте рішення впевненіше", "Керуйте фінансами разом", "Керуйте бізнесом", "Yassia завжди поруч"], perspectivesEyebrow: "Три погляди", perspectivesTitle: "Ті самі цифри розповідають різні історії різним людям.", discover: "Докладніше",
    perspectives: [["Особистий", "Мої гроші нарешті зрозумілі", "Місячні бюджети, витрати, прогноз залишку й персональний помічник на основі ваших даних."], ["Група", "Спільні витрати без напруги", "Спільні витрати, власні частки, баланси учасників і підтверджені або оскаржені розрахунки."], ["Бізнес", "Керована ліквідність", "Прогнози, надходження, орієнтовні податки, процеси, аудит і ШІ-помічник для малого бізнесу."]],
    chainEyebrow: "Від файлу до дії", chainTitle: "Повний фінансовий ланцюжок без чорної скриньки.", chainText: "Кожна функція підтримує конкретний етап фінансового керування.", allFeatures: "Усі можливості",
    capabilities: [["Імпорт без підключення банку", "Ваші виписки проходять через приватне сховище й видаляються після обробки."], ["Категоризація, що навчається", "Виправте категорію один раз. Правило буде запропоновано для наступних імпортів."], ["Більше, ніж поточний баланс", "Прогнози на 30, 60 або 90 днів з регулярними витратами й сценаріями."], ["Працюйте з важливим", "Одна скринька збирає аномалії, бюджети, прострочення та строки."], ["Співпраця з чіткими ролями", "Перегляд, участь, адміністрування, погодження та журнал аудиту."], ["Запитайте Yassia", "ШІ викликає лише потрібні інструменти й відповідає на основі вашого простору."]],
    aiEyebrow: "Yassia, ШІ-помічник", aiTitle: "Одне питання. Три кути рішення.", aiText: "Yassia не просто переказує цифри: обирає інструменти, готує контекст і відповідає відповідно до вашої мети.", aiLink: "Як працює ШІ", personas: [["Обережність", "Захистити", "Виявляє ризики ліквідності, аномалії та рішення, які можуть зачекати."], ["Керування", "Збалансувати", "Структурує огляд, визначає пріоритети й пояснює відхилення."], ["Зростання", "Спрогнозувати", "Досліджує інвестиційну спроможність і сценарії розвитку."]],
    ctaTitle: "Почніть із виписок, які вже маєте.", ctaText: "Створіть простір, оберіть сценарій і отримайте перший огляд за кілька хвилин.",
  },
} as const;

export default function LandingPage() {
  const { locale } = useI18n();
  const copy = landingCopy[locale];
  const perspectives = perspectiveMeta.map(([icon, href, color], index) => ({ icon, href, color, eyebrow: copy.perspectives[index][0], title: copy.perspectives[index][1], description: copy.perspectives[index][2] }));
  const capabilities = capabilityIcons.map((Icon, index) => [Icon, copy.capabilities[index][0], copy.capabilities[index][1]] as const);
  const personas = copy.personas;
  return (
    <PublicShell>
      <section className="public-grid hero-grid relative overflow-hidden">
        <div className="public-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <Reveal className="hero-copy-surface relative isolate mx-auto max-w-5xl text-center">
            <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] text-slate-950 dark:text-white sm:text-7xl">
              {copy.heroA}
              <span className="hero-gradient-text block">
                {copy.heroB}
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-balance text-lg leading-8 text-slate-700 dark:text-slate-300 sm:text-xl">
              {copy.heroText}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/signup">{copy.create} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-primary/35 bg-indigo-50/90 text-primary shadow-lg shadow-primary/10 hover:border-primary/60 hover:bg-indigo-100 hover:text-primary dark:border-white/30 dark:bg-white/10 dark:text-white dark:shadow-black/20 dark:hover:border-white/50 dark:hover:bg-white/15 dark:hover:text-white"
              >
                <Link href="/solutions">{copy.choose}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-500">{copy.beta}</p>
          </Reveal>

          <Reveal className="mt-16" delay={0.1}>
            <ProductPreview />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="landing-marquee overflow-hidden" aria-label={copy.stripLabel}>
          <motion.div
            className="landing-marquee-track flex w-max"
            initial={{ x: "-50%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 36, repeat: Infinity, repeatType: "loop", ease: "linear" }}
          >
            {[0, 1].map((group) => (
              <div
                key={group}
                className="flex shrink-0"
                aria-hidden={group === 1 ? true : undefined}
              >
                {copy.strip.map((item) => (
                  <div
                    key={`${group}-${item}`}
                    className="flex shrink-0 items-center gap-2 border-r border-white/10 bg-slate-950 px-8 py-5 text-sm font-medium text-slate-400"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                    <span className="whitespace-nowrap">{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-slate-950 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{copy.perspectivesEyebrow}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.perspectivesTitle}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {perspectives.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.07}>
                <Link href={item.href} className="group block h-full rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.055]">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-slate-200 group-hover:text-white">
                    {copy.discover} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{copy.chainEyebrow}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.chainTitle}
            </h2>
            <p className="mt-5 text-lg text-slate-400">{copy.chainText}</p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([Icon, title, description], index) => (
              <Reveal key={title} delay={(index % 3) * 0.06} className="rounded-2xl border border-white/10 bg-slate-950/70 p-6">
                <Icon className="h-5 w-5 text-teal" />
                <h3 className="mt-5 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" asChild className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/features">{copy.allFeatures} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal">{copy.aiEyebrow}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {copy.aiTitle}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              {copy.aiText}
            </p>
            <Button asChild className="mt-8 bg-white text-slate-950 hover:bg-slate-100">
              <Link href="/ai">{copy.aiLink} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </Reveal>
          <div className="grid gap-4">
            {personas.map(([name, verb, description], index) => (
              <Reveal key={name} delay={index * 0.08} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:grid-cols-[140px_1fr] sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">{verb}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{name}</p>
                </div>
                <p className="text-sm leading-6 text-slate-400">{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="public-always-white border-t border-white/10 bg-gradient-to-br from-indigo-600 via-primary to-teal px-4 py-20 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {copy.ctaTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
            {copy.ctaText}
          </p>
          <Button size="lg" variant="secondary" asChild className="mt-8">
            <Link href="/signup">{copy.create} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Reveal>
      </section>
    </PublicShell>
  );
}
