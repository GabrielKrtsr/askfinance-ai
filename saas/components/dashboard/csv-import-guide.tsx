"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FileDown,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  Monitor,
  Search,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CSV_TEMPLATE = [
  "Date;Libellé;Montant;Catégorie;Référence",
  "01/07/2026;Virement client;1250,00;Ventes;FAC-104",
  "02/07/2026;Hébergement;-29,00;Logiciels;VERCEL-JUILLET",
].join("\r\n");

export function CsvImportGuide({
  prominent = false,
  className,
}: {
  prominent?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF", CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-import-askfinance.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openGuide() {
    setPage(0);
    setOpen(true);
  }

  const documentation = open && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/30 p-0 backdrop-blur-sm sm:p-5">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Fermer la documentation"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-documentation-title"
            className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl sm:max-h-[92vh] sm:max-w-6xl sm:rounded-3xl"
          >
            <header className="shrink-0 bg-background px-5 pb-4 pt-5 sm:px-8 sm:pb-5 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Documentation CSV</p>
                    <h2 id="csv-documentation-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                      De votre banque à AskFinance
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label="Fermer la documentation"
                  title="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DocumentationNavigation page={page} onChange={setPage} />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 to-background">
              <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8 sm:py-9">
                {page === 0 && <BankExportSection />}
                {page === 1 && <CsvFormatSection onDownload={downloadTemplate} />}
                {page === 2 && <AskFinanceImportSection />}
                {page === 3 && <TroubleshootingSection />}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 bg-background px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.05)] sm:px-8">
              <p className="hidden text-xs text-muted-foreground sm:block">Page {page + 1} sur 4</p>
              <div className="ml-auto flex gap-2">
                {page > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setPage((value) => value - 1)}>
                    Précédent
                  </Button>
                )}
                {page < 3 ? (
                  <Button type="button" onClick={() => setPage((value) => value + 1)}>
                    Suivant <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setOpen(false)}>
                    <Check className="h-4 w-4" /> J'ai compris
                  </Button>
                )}
              </div>
            </footer>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between",
          prominent && "p-5",
          className
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {prominent
                ? "Vous ne savez pas où récupérer le fichier ?"
                : "Besoin d'aide pour votre CSV ?"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Export bancaire, format attendu, exemple et résolution des erreurs.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={openGuide} className="shrink-0">
          <BookOpen className="h-4 w-4" />
          Voir le guide d'import
        </Button>
      </div>

      {documentation}
    </>
  );
}

function DocumentationNavigation({
  page,
  onChange,
}: {
  page: number;
  onChange: (page: number) => void;
}) {
  const items = [
    { label: "Depuis la banque", icon: Landmark },
    { label: "Préparer le CSV", icon: FileSpreadsheet },
    { label: "Importer", icon: Upload },
    { label: "Résoudre un problème", icon: AlertCircle },
  ];

  return (
    <nav className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1" aria-label="Pages de la documentation">
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = page === index;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(index)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:text-sm",
              active
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden truncate sm:inline">{item.label}</span>
            <span className="sm:hidden">{index + 1}</span>
          </button>
        );
      })}
    </nav>
  );
}

function BankExportSection() {
  return (
    <section>
      <SectionTitle number="1" title="Récupérer le CSV depuis votre banque" subtitle="Le site web de la banque offre généralement plus d'options d'export que l'application mobile." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <ol className="space-y-3">
          <Instruction icon={<Monitor />} title="Connectez-vous à votre espace bancaire" text="Utilisez directement le site ou l'application officielle de votre banque." />
          <Instruction icon={<Search />} title="Ouvrez le compte concerné" text="Affichez la liste des opérations, mouvements ou transactions." />
          <Instruction icon={<FileDown />} title="Cherchez Exporter ou Télécharger" text="Le bouton peut aussi être nommé Export des opérations ou Relevé de compte." />
          <Instruction icon={<Check />} title="Choisissez le format CSV" text="Sélectionnez la période souhaitée, puis validez le téléchargement." />
        </ol>
        <BankExportMockup />
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold">Les intitulés changent selon les banques</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Si vous ne trouvez rien dans l'application mobile, essayez le site web sur ordinateur. Regardez près des filtres de date, du menu des opérations ou d'une icône de téléchargement.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold">Vos accès restent privés</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Vous téléchargez vous-même le fichier puis vous l'envoyez à AskFinance. Ne communiquez jamais votre identifiant, votre mot de passe ou votre code de validation bancaire.
          </p>
        </div>
      </div>
    </section>
  );
}

function BankExportMockup() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-medium text-muted-foreground">Espace bancaire</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Compte principal</p>
            <p className="mt-1 text-xl font-bold">8 420,15 €</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Download className="h-3.5 w-3.5" /> Exporter
          </span>
        </div>
        <div className="mt-5 rounded-lg border p-3">
          <p className="text-xs font-semibold">Exporter les opérations</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/30 px-3 py-2"><span className="block text-muted-foreground">Période</span><strong className="mt-1 block">01/01 au 31/07</strong></div>
            <div className="rounded-md border border-primary bg-primary/5 px-3 py-2"><span className="block text-muted-foreground">Format</span><strong className="mt-1 flex items-center gap-1 text-primary"><Check className="h-3 w-3" /> CSV</strong></div>
          </div>
          <div className="mt-3 flex justify-end"><span className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Télécharger</span></div>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Illustration générique. L'interface réelle dépend de votre banque.</p>
      </div>
    </div>
  );
}

function CsvFormatSection({ onDownload }: { onDownload: () => void }) {
  return (
    <section>
      <SectionTitle number="2" title="Vérifier le format du fichier" subtitle="AskFinance reconnaît automatiquement les noms de colonnes les plus courants." />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <RequiredColumn name="Date" aliases="Date opération, Date de valeur" example="01/07/2026" />
        <RequiredColumn name="Libellé" aliases="Description, Intitulé, Merchant" example="Virement client" />
        <RequiredColumn name="Montant" aliases="Amount ou colonnes Débit / Crédit" example="1250,00 ou -29,00" />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Exemple compatible</h3>
          <p className="mt-1 text-xs text-muted-foreground">Catégorie et Référence sont facultatives.</p>
        </div>
        <Button type="button" variant="outline" onClick={onDownload}>
          <Download className="h-4 w-4" /> Télécharger ce modèle CSV
        </Button>
      </div>
      <ExampleTable />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormatNote title="Montant dans une seule colonne" text="Une dépense est négative, par exemple -29,00. Un revenu est positif, par exemple 1250,00." />
        <FormatNote title="Débit et Crédit séparés" text="Les exports avec deux colonnes distinctes Débit et Crédit sont également acceptés." />
        <FormatNote title="Dates acceptées" text="Utilisez JJ/MM/AAAA ou AAAA-MM-JJ. Les lignes avec une date illisible seront ignorées." />
        <FormatNote title="Fichier accepté" text="CSV de 10 Mo maximum, séparé par virgule ou point-virgule, encodé en UTF-8 ou Latin-1." />
      </div>
      <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        Votre banque fournit seulement un fichier XLS ou XLSX ? Ouvrez-le dans Excel, Google Sheets ou LibreOffice, puis utilisez <strong className="text-foreground">Enregistrer sous</strong> ou <strong className="text-foreground">Télécharger</strong> au format <strong className="text-foreground">CSV UTF-8</strong>.
      </div>
    </section>
  );
}

function AskFinanceImportSection() {
  return (
    <section>
      <SectionTitle number="3" title="Importer le fichier dans AskFinance" subtitle="Une fois le CSV téléchargé, revenez à la fenêtre d'import." />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ImportStep number="1" title="Choisissez le compte" text="Sélectionnez le compte bancaire correspondant ou créez-le avec son solde initial." icon={<Landmark />} />
        <ImportStep number="2" title="Choisissez le CSV" text="Cliquez sur Choisir un fichier, puis sélectionnez le document téléchargé depuis la banque." icon={<FileSpreadsheet />} />
        <ImportStep number="3" title="Lancez l'import" text="AskFinance analyse les lignes, ajoute les nouvelles transactions et ignore les doublons déjà présents." icon={<Upload />} />
      </div>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="font-semibold">Dans la fenêtre où vous étiez juste avant</p>
            <p className="mt-1 text-sm text-muted-foreground">Fermez ce guide, choisissez votre fichier dans la zone prévue, puis cliquez sur Importer.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Choisir un fichier <ArrowRight className="h-4 w-4" /></span>
        </div>
      </div>
    </section>
  );
}

function TroubleshootingSection() {
  return (
    <section>
      <SectionTitle number="4" title="Si l'import ne fonctionne pas" subtitle="Les causes les plus fréquentes se corrigent directement dans le fichier." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Trouble title="Colonnes manquantes" solution="Vérifiez que la première ligne contient une Date, un Libellé et un Montant, ou bien Débit et Crédit." />
        <Trouble title="Aucune transaction importée" solution="Vérifiez les dates, les montants et les libellés. Une ligne incomplète ou illisible est ignorée." />
        <Trouble title="Aucune nouvelle transaction" solution="Le fichier a probablement déjà été importé. AskFinance ignore les doublons sans effacer l'existant." />
        <Trouble title="Fichier refusé" solution="Convertissez le PDF, XLS ou XLSX en CSV UTF-8 et vérifiez que sa taille ne dépasse pas 10 Mo." />
      </div>
    </section>
  );
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{number}</span>
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Instruction({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>
    </li>
  );
}

function RequiredColumn({ name, aliases, example }: { name: string; aliases: string; example: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="text-sm font-semibold">{name}</p></div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Alias : {aliases}</p>
      <p className="mt-2 rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{example}</p>
    </div>
  );
}

function ExampleTable() {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="border-b bg-muted/50 text-muted-foreground"><tr><th className="px-3 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Libellé</th><th className="px-3 py-2.5 font-medium">Montant</th><th className="px-3 py-2.5 font-medium">Catégorie</th><th className="px-3 py-2.5 font-medium">Référence</th></tr></thead>
        <tbody>
          <tr className="border-b"><td className="px-3 py-2.5">01/07/2026</td><td className="px-3 py-2.5">Virement client</td><td className="px-3 py-2.5 font-semibold text-emerald-600">1 250,00</td><td className="px-3 py-2.5">Ventes</td><td className="px-3 py-2.5">FAC-104</td></tr>
          <tr><td className="px-3 py-2.5">02/07/2026</td><td className="px-3 py-2.5">Hébergement</td><td className="px-3 py-2.5 font-semibold text-red-600">-29,00</td><td className="px-3 py-2.5">Logiciels</td><td className="px-3 py-2.5">VERCEL-JUILLET</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function FormatNote({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}

function ImportStep({ number, title, text, icon }: { number: string; title: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span><span className="text-xs font-bold text-muted-foreground">ÉTAPE {number}</span></div>
      <p className="mt-4 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function Trouble({ title, solution }: { title: string; solution: string }) {
  return <div className="flex items-start gap-3 rounded-xl border p-4"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{solution}</p></div></div>;
}
