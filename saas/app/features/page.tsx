import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, Bot, Check, FileSpreadsheet, LineChart, ListChecks, Scale, Tags, Users, WalletCards } from "lucide-react";

import { PageHero } from "@/components/landing/page-hero";
import { PublicShell } from "@/components/landing/public-shell";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Fonctionnalités | AskFinance AI",
  description: "Import CSV, budgets, prévisions, dépenses partagées, encaissements, workflows et copilote IA.",
};

const groupIcons = [FileSpreadsheet, Tags, LineChart, BellRing, Users, Bot] as const;
const availability = [[true,false,true],[false,true,false],[true,false,true],[false,false,true],[true,false,true],[false,false,true]] as const;
const copies = {
  fr: { eyebrow:"Fonctionnalités", title:"Chaque écran doit conduire à une action.", intro:"AskFinance relie les transactions, les budgets, les échéances et les décisions au lieu d’empiler des graphiques sans contexte.", solutions:"Voir les solutions", groups:[["Structurer",["Import CSV privé et dédoublonné","Comptes multiples et soldes d’ouverture","Catégories corrigibles et règles apprenantes"]],["Comprendre",["Dépenses par catégorie","Flux mensuels et indicateurs","Recherche, filtres et historique"]],["Anticiper",["Prévisions à 30, 60 et 90 jours","Charges récurrentes et anomalies","Budgets variables par mois"]],["Agir",["Boîte de réception financière","Encaissements attendus et paiements partiels","Brouillons de relance et suivi"]],["Collaborer",["Rôles viewer, member, admin et owner","Demandes de validation","Journal d’audit des actions sensibles"]],["Questionner",["Yassia avec outils financiers","Historique de conversation","Modes Prudence, Pilotage et Croissance"]]], matrixTitle:"Le bon périmètre pour chaque espace.", capability:"Capacité", spaces:["Solo","Groupe","Entreprise"], matrix:["Budgets et dépenses","Dépenses partagées","Prévisions de solde","Encaissements et fiscalité","Yassia IA","Rôles, workflows et audit"], csv:"La synchronisation bancaire n’est pas active : les données sont importées par CSV.", values:["Des chiffres traçables","Des actions validables","Des limites explicites"] },
  en: { eyebrow:"Features", title:"Every screen should lead to an action.", intro:"AskFinance connects transactions, budgets, deadlines and decisions instead of stacking charts without context.", solutions:"See solutions", groups:[["Structure",["Private, deduplicated CSV import","Multiple accounts and opening balances","Editable categories and learning rules"]],["Understand",["Spending by category","Monthly flows and indicators","Search, filters and history"]],["Anticipate",["30, 60 and 90-day forecasts","Recurring charges and anomalies","Monthly variable budgets"]],["Act",["Financial inbox","Expected receivables and partial payments","Reminder drafts and tracking"]],["Collaborate",["Viewer, member, admin and owner roles","Approval requests","Audit log for sensitive actions"]],["Ask",["Yassia with financial tools","Conversation history","Caution, Management and Growth modes"]]], matrixTitle:"The right scope for every workspace.", capability:"Capability", spaces:["Solo","Group","Business"], matrix:["Budgets and spending","Shared expenses","Balance forecasts","Receivables and tax","Yassia AI","Roles, workflows and audit"], csv:"Bank synchronization is not active: data is imported by CSV.", values:["Traceable numbers","Approvable actions","Explicit limits"] },
  uk: { eyebrow:"Можливості", title:"Кожен екран має вести до дії.", intro:"AskFinance поєднує транзакції, бюджети, строки й рішення замість набору графіків без контексту.", solutions:"Переглянути рішення", groups:[["Структурувати",["Приватний імпорт CSV без дублікатів","Кілька рахунків і початкові баланси","Редаговані категорії та навчальні правила"]],["Розуміти",["Витрати за категоріями","Місячні потоки й показники","Пошук, фільтри та історія"]],["Передбачати",["Прогнози на 30, 60 і 90 днів","Регулярні витрати й аномалії","Змінні бюджети за місяцями"]],["Діяти",["Фінансова скринька","Очікувані надходження й часткові платежі","Чернетки нагадувань і контроль"]],["Співпрацювати",["Ролі viewer, member, admin та owner","Запити на погодження","Журнал аудиту чутливих дій"]],["Запитувати",["Yassia з фінансовими інструментами","Історія розмов","Режими Обережність, Керування та Зростання"]]], matrixTitle:"Правильні можливості для кожного простору.", capability:"Можливість", spaces:["Особисто","Група","Бізнес"], matrix:["Бюджети й витрати","Спільні витрати","Прогнози балансу","Надходження й податки","ШІ Yassia","Ролі, процеси й аудит"], csv:"Банківська синхронізація неактивна: дані імпортуються через CSV.", values:["Простежувані цифри","Дії із погодженням","Чіткі межі"] },
} as const;

export default function FeaturesPage() {
  const copy = copies[getLocale()];
  const groups = groupIcons.map((Icon,index) => [copy.groups[index][0],Icon,copy.groups[index][1]] as const);
  const matrix = copy.matrix.map((label,index) => [label,...availability[index]] as const);
  return (
    <PublicShell>
      <PageHero eyebrow={copy.eyebrow} title={copy.title} description={copy.intro}>
        <Button asChild className="bg-white text-slate-950 hover:bg-slate-100"><Link href="/solutions">{copy.solutions} <ArrowRight className="h-4 w-4" /></Link></Button>
      </PageHero>
      <section className="bg-slate-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(([title, Icon, items], index) => (
              <Reveal key={title} delay={(index % 3) * 0.06} className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <Icon className="h-6 w-6 text-teal" />
                <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
                <ul className="mt-5 space-y-3">
                  {items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-400"><Check className="mt-1 h-4 w-4 shrink-0 text-teal" />{item}</li>)}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="border-y border-white/10 bg-slate-900/50 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal className="text-center"><h2 className="text-3xl font-semibold text-white sm:text-4xl">{copy.matrixTitle}</h2></Reveal>
          <Reveal className="mt-10 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1.6fr_repeat(3,0.7fr)] bg-white/[0.06] px-4 py-3 text-xs font-semibold text-slate-300 sm:px-6"><span>{copy.capability}</span>{copy.spaces.map(space=><span key={space}>{space}</span>)}</div>
            {matrix.map(([label, solo, group, business]) => (
              <div key={label} className="grid grid-cols-[1.6fr_repeat(3,0.7fr)] items-center border-t border-white/10 px-4 py-4 text-sm sm:px-6">
                <span className="text-slate-300">{label}</span>
                {[solo, group, business].map((available, index) => <span key={index}>{available ? <Check className="h-4 w-4 text-teal" /> : <span className="text-slate-500">Non</span>}</span>)}
              </div>
            ))}
          </Reveal>
          <p className="mt-5 text-center text-xs text-slate-500">{copy.csv}</p>
        </div>
      </section>
      <section className="bg-slate-950 py-20"><div className="mx-auto grid max-w-5xl gap-5 px-4 sm:grid-cols-3 sm:px-6">
        {[[WalletCards,copy.values[0]],[ListChecks,copy.values[1]],[Scale,copy.values[2]]].map(([titleIcon,title]) => { const Icon=titleIcon as typeof WalletCards; return <Reveal key={String(title)} className="text-center"><Icon className="mx-auto h-5 w-5 text-teal"/><p className="mt-3 font-medium text-white">{String(title)}</p></Reveal>; })}
      </div></section>
    </PublicShell>
  );
}
