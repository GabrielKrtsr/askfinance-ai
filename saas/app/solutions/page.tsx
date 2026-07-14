import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, PiggyBank, Users } from "lucide-react";

import { PageHero } from "@/components/landing/page-hero";
import { PublicShell } from "@/components/landing/public-shell";
import { Reveal } from "@/components/landing/reveal";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Solutions | AskFinance AI", description: "Un espace financier pour un usage solo, de groupe ou d’entreprise." };

const meta = [[PiggyBank,"/solutions/solo"],[Users,"/solutions/group"],[BriefcaseBusiness,"/solutions/business"]] as const;
const copies = {
  fr:{title:"Commencez par la décision que vous devez prendre.",intro:"Le vocabulaire, les indicateurs et les outils changent selon que vous gérez votre argent, un groupe ou une entreprise.",items:[["Solo","B2C","Tenir un budget mensuel, comprendre ses dépenses et anticiper son solde.","Pour une personne"],["Groupe","B2C collectif","Partager les dépenses, calculer les parts et suivre les règlements sans tableur.","Pour un couple, une colocation ou un voyage"],["Entreprise","B2B","Piloter la trésorerie, les encaissements, les échéances et les validations.","Pour TPE, PME et équipes finance"]],see:"Voir la solution",note:"Vous pouvez créer plusieurs espaces et passer de l’un à l’autre. Les données et les rôles restent séparés par espace."},
  en:{title:"Start with the decision you need to make.",intro:"Language, indicators and tools change depending on whether you manage your own money, a group or a business.",items:[["Solo","B2C","Manage a monthly budget, understand spending and anticipate your balance.","For one person"],["Group","Collaborative B2C","Share expenses, calculate shares and track settlements without a spreadsheet.","For couples, flatmates or trips"],["Business","B2B","Manage cash flow, receivables, deadlines and approvals.","For small businesses and finance teams"]],see:"View solution",note:"You can create several workspaces and switch between them. Data and roles remain separate in each workspace."},
  uk:{title:"Почніть із рішення, яке потрібно ухвалити.",intro:"Мова, показники та інструменти залежать від того, чи керуєте ви власними коштами, групою або бізнесом.",items:[["Особисто","B2C","Керуйте місячним бюджетом, розумійте витрати й прогнозуйте залишок.","Для однієї людини"],["Група","Спільний B2C","Діліть витрати, обчислюйте частки й відстежуйте розрахунки без таблиць.","Для пари, співмешканців або подорожі"],["Бізнес","B2B","Керуйте ліквідністю, надходженнями, строками й погодженнями.","Для малого бізнесу та фінансових команд"]],see:"Переглянути рішення",note:"Ви можете створити кілька просторів і перемикатися між ними. Дані та ролі в кожному просторі залишаються окремими."},
} as const;

export default function SolutionsPage() {
  const copy = copies[getLocale()];
  const solutions = meta.map(([Icon,href],index)=>[Icon,...copy.items[index],href] as const);
  return <PublicShell>
    <PageHero eyebrow="Solutions" title={copy.title} description={copy.intro} />
    <section className="bg-slate-950 py-20 sm:py-28"><div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
      {solutions.map(([Icon,title,kind,description,audience,href], index) => <Reveal key={title} delay={index*0.07}>
        <Link href={href} className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:border-teal/40">
          <Icon className="h-7 w-7 text-teal"/><p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{kind}</p><h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2><p className="mt-4 flex-1 text-sm leading-6 text-slate-400">{description}</p><p className="mt-6 border-t border-white/10 pt-5 text-xs text-slate-500">{audience}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white">{copy.see} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
        </Link>
      </Reveal>)}
    </div></section>
    <section className="border-t border-white/10 bg-slate-900/50 py-16"><Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6"><p className="text-lg leading-8 text-slate-300">{copy.note}</p></Reveal></section>
  </PublicShell>;
}
