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
import { useI18n } from "@/lib/i18n/client";
import { csvGuideCopy, type CsvGuideCopy } from "@/lib/i18n/csv-guide";
import { cn } from "@/lib/utils";

const CSV_TEMPLATE = [
  "Date;Label;Amount;Category;Reference",
  "01/07/2026;Client transfer;1250.00;Sales;INV-104",
  "02/07/2026;Hosting;-29.00;Software;VERCEL-JULY",
].join("\r\n");

export function CsvImportGuide({
  prominent = false,
  className,
}: {
  prominent?: boolean;
  className?: string;
}) {
  const { locale } = useI18n();
  const copy = csvGuideCopy[locale];
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
    link.download = "askfinance-import-template.csv";
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
            aria-label={copy.closeDocumentation}
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
                    <h2 id="csv-documentation-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                      {copy.title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={copy.closeDocumentation}
                  title={copy.close}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DocumentationNavigation page={page} onChange={setPage} copy={copy} />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-muted/20 to-background">
              <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8 sm:py-9">
                {page === 0 && <BankExportSection copy={copy} />}
                {page === 1 && <CsvFormatSection onDownload={downloadTemplate} copy={copy} />}
                {page === 2 && <AskFinanceImportSection copy={copy} />}
                {page === 3 && <TroubleshootingSection copy={copy} />}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 bg-background px-5 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.05)] sm:px-8">
              <p className="hidden text-xs text-muted-foreground sm:block">{copy.page(page + 1)}</p>
              <div className="ml-auto flex gap-2">
                {page > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setPage((value) => value - 1)}>
                    {copy.previous}
                  </Button>
                )}
                {page < 3 ? (
                  <Button type="button" onClick={() => setPage((value) => value + 1)}>
                    {copy.next} <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setOpen(false)}>
                    <Check className="h-4 w-4" /> {copy.understood}
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
                ? copy.prominentTitle
                : copy.helpTitle}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.helpDescription}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={openGuide} className="shrink-0">
          <BookOpen className="h-4 w-4" />
          {copy.openGuide}
        </Button>
      </div>

      {documentation}
    </>
  );
}

function DocumentationNavigation({
  page,
  onChange,
  copy,
}: {
  page: number;
  onChange: (page: number) => void;
  copy: CsvGuideCopy;
}) {
  const items = [
    { label: copy.nav[0], icon: Landmark },
    { label: copy.nav[1], icon: FileSpreadsheet },
    { label: copy.nav[2], icon: Upload },
    { label: copy.nav[3], icon: AlertCircle },
  ];

  return (
    <nav className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1" aria-label={copy.documentationPages}>
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

function BankExportSection({ copy }: { copy: CsvGuideCopy }) {
  const instructionIcons = [<Monitor key="monitor" />, <Search key="search" />, <FileDown key="file" />, <Check key="check" />];
  return (
    <section>
      <SectionTitle number="1" title={copy.bankTitle} subtitle={copy.bankSubtitle} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <ol className="space-y-3">
          {copy.bankInstructions.map(([title, text], index) => (
            <Instruction key={title} icon={instructionIcons[index]} title={title} text={text} />
          ))}
        </ol>
        <BankExportMockup copy={copy} />
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold">{copy.bankWarningTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.bankWarningText}</p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold">{copy.privacyTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.privacyText}</p>
        </div>
      </div>
    </section>
  );
}

function BankExportMockup({ copy }: { copy: CsvGuideCopy }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-medium text-muted-foreground">{copy.bankArea}</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{copy.mainAccount}</p>
            <p className="mt-1 text-xl font-bold">8 420,15 €</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Download className="h-3.5 w-3.5" /> {copy.export}
          </span>
        </div>
        <div className="mt-5 rounded-lg border p-3">
          <p className="text-xs font-semibold">{copy.exportOperations}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/30 px-3 py-2"><span className="block text-muted-foreground">{copy.period}</span><strong className="mt-1 block">01/01 - 31/07</strong></div>
            <div className="rounded-md border border-primary bg-primary/5 px-3 py-2"><span className="block text-muted-foreground">{copy.format}</span><strong className="mt-1 flex items-center gap-1 text-primary"><Check className="h-3 w-3" /> CSV</strong></div>
          </div>
          <div className="mt-3 flex justify-end"><span className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">{copy.download}</span></div>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{copy.bankIllustration}</p>
      </div>
    </div>
  );
}

function CsvFormatSection({ onDownload, copy }: { onDownload: () => void; copy: CsvGuideCopy }) {
  return (
    <section>
      <SectionTitle number="2" title={copy.formatTitle} subtitle={copy.formatSubtitle} />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {copy.columns.map(([name, aliases, example]) => (
          <RequiredColumn key={name} name={name} aliases={aliases} example={example} aliasLabel={copy.aliases} />
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{copy.compatibleExample}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{copy.optionalColumns}</p>
        </div>
        <Button type="button" variant="outline" onClick={onDownload}>
          <Download className="h-4 w-4" /> {copy.downloadTemplate}
        </Button>
      </div>
      <ExampleTable copy={copy} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {copy.formatNotes.map(([title, text]) => <FormatNote key={title} title={title} text={text} />)}
      </div>
      <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        {copy.spreadsheetHelp}
      </div>
    </section>
  );
}

function AskFinanceImportSection({ copy }: { copy: CsvGuideCopy }) {
  const icons = [<Landmark key="bank" />, <FileSpreadsheet key="file" />, <Upload key="upload" />];
  return (
    <section>
      <SectionTitle number="3" title={copy.importTitle} subtitle={copy.importSubtitle} />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {copy.importSteps.map(([title, text], index) => (
          <ImportStep key={title} number={String(index + 1)} title={title} text={text} icon={icons[index]} stepLabel={copy.stepLabel} />
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="font-semibold">{copy.importWhereTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.importWhereText}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{copy.chooseFile} <ArrowRight className="h-4 w-4" /></span>
        </div>
      </div>
    </section>
  );
}

function TroubleshootingSection({ copy }: { copy: CsvGuideCopy }) {
  return (
    <section>
      <SectionTitle number="4" title={copy.troubleTitle} subtitle={copy.troubleSubtitle} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {copy.troubles.map(([title, solution]) => <Trouble key={title} title={title} solution={solution} />)}
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

function RequiredColumn({ name, aliases, example, aliasLabel }: { name: string; aliases: string; example: string; aliasLabel: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="text-sm font-semibold">{name}</p></div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{aliasLabel}: {aliases}</p>
      <p className="mt-2 rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{example}</p>
    </div>
  );
}

function ExampleTable({ copy }: { copy: CsvGuideCopy }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[620px] text-left text-xs">
        <thead className="border-b bg-muted/50 text-muted-foreground"><tr>{copy.tableHeaders.map((header) => <th key={header} className="px-3 py-2.5 font-medium">{header}</th>)}</tr></thead>
        <tbody>
          {copy.tableRows.map((row, rowIndex) => (
            <tr key={row.join("-")} className={rowIndex === 0 ? "border-b" : undefined}>
              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={cn("px-3 py-2.5", cellIndex === 2 && "font-semibold", cellIndex === 2 && (rowIndex === 0 ? "text-emerald-600" : "text-red-600"))}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormatNote({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}

function ImportStep({ number, title, text, icon, stepLabel }: { number: string; title: string; text: string; icon: React.ReactNode; stepLabel: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span><span className="text-xs font-bold text-muted-foreground">{stepLabel} {number}</span></div>
      <p className="mt-4 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function Trouble({ title, solution }: { title: string; solution: string }) {
  return <div className="flex items-start gap-3 rounded-xl border p-4"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{solution}</p></div></div>;
}
