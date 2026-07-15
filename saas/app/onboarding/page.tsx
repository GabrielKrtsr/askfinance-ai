"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  KeyRound,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Upload,
  User,
  Users,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { CsvImportGuide } from "@/components/dashboard/csv-import-guide";
import { PublicPreferences } from "@/components/landing/public-preferences";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWorkspace,
  getOnboardingContext,
  joinByCode,
  setOnboardingStatus,
} from "@/lib/actions/workspaces";
import { createAccount } from "@/lib/services/accounts";
import { importTransactionsFromCsv } from "@/lib/services/import-transactions";
import { useI18n } from "@/lib/i18n/client";
import { onboardingCopy, type OnboardingCopy } from "@/lib/i18n/onboarding";
import { publicCommon } from "@/lib/i18n/public";
import { cn } from "@/lib/utils";

type WorkspaceKind = "personal" | "business" | "group";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(
  size: number,
  locale: "fr" | "en" | "uk",
  units: OnboardingCopy["units"]
) {
  if (size < 1024) return `${size} ${units.bytes}`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} ${units.kilobytes}`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / (1024 * 1024))} ${units.megabytes}`;
}

function localizedError(
  error: unknown,
  fallback: string,
  locale: "fr" | "en" | "uk"
) {
  return locale === "fr" && error instanceof Error ? error.message : fallback;
}

type Step =
  | "loading"
  | "type"
  | "personal"
  | "group"
  | "proChoice"
  | "business"
  | "join"
  | "pending"
  | "account"
  | "import"
  | "groupReady";

export default function OnboardingPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = onboardingCopy[locale];
  const common = publicCommon[locale];
  const copyRef = useRef(copy);
  const localeRef = useRef(locale);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [step, setStep] = useState<Step>("loading");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceKind | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    copyRef.current = copy;
    localeRef.current = locale;
  }, [copy, locale]);

  useEffect(() => {
    let active = true;

    async function resume() {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get("invite");
      if (invite) {
        if (!active) return;
        setCode(invite.trim().toUpperCase());
        setStep("join");
        return;
      }
      if (params.get("new") === "1") {
        if (active) setStep("type");
        return;
      }

      try {
        const context = await getOnboardingContext();
        if (!active) return;
        if (!context) {
          setStep("type");
          return;
        }

        const { workspace, firstAccount, hasTransactions } = context;
        if (workspace.onboardingStatus !== "pending") {
          router.replace(workspace.type === "group" ? "/dashboard/shared" : "/dashboard");
          return;
        }

        setWorkspaceId(workspace.id);
        setWorkspaceType(workspace.type);
        setWorkspaceName(workspace.name);

        if (workspace.type === "group") {
          setStep("groupReady");
        } else if (hasTransactions) {
          await setOnboardingStatus(workspace.id, "completed");
          router.replace("/dashboard");
          router.refresh();
        } else if (firstAccount) {
          setAccountId(firstAccount.id);
          setAccountName(firstAccount.name);
          setStep("import");
        } else {
          setStep("account");
        }
      } catch (e) {
        if (!active) return;
        setError(localizedError(e, copyRef.current.resumeFailed, localeRef.current));
        setStep("type");
      }
    }

    resume();
    return () => {
      active = false;
    };
  }, [router]);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function handleCreate(type: WorkspaceKind) {
    setLoading(true);
    setError(null);
    try {
      const workspace = await createWorkspace({ type, name: name.trim() });
      setWorkspaceId(workspace.id);
      setWorkspaceType(type);
      setWorkspaceName(name.trim());
      setStep(type === "group" ? "groupReady" : "account");
    } catch (e) {
      setError(localizedError(e, copy.genericError, locale));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount() {
    setLoading(true);
    setError(null);
    const normalized = Number(openingBalance.trim().replace(",", ".") || "0");
    if (!Number.isFinite(normalized)) {
      setError(copy.invalidBalance);
      setLoading(false);
      return;
    }

    try {
      const account = await createAccount(accountName.trim(), normalized);
      if (!account) throw new Error(copy.accountCreationFailed);
      setAccountId(account.id);
      setStep("import");
    } catch (e) {
      setError(localizedError(e, copy.accountCreationFailed, locale));
    } finally {
      setLoading(false);
    }
  }

  async function finish(status: "completed" | "skipped") {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      await setOnboardingStatus(workspaceId, status);
      router.push(workspaceType === "group" ? "/dashboard/shared" : "/dashboard");
      router.refresh();
    } catch (e) {
      setError(localizedError(e, copy.finishFailed, locale));
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file || !accountId) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const result = await importTransactionsFromCsv(file, accountId, setProgress);
      if (result.inserted === 0) {
        throw new Error(
          result.errors[0] ??
            (result.duplicates > 0
              ? copy.noNewTransaction
              : copy.noUsableTransaction)
        );
      }
      await setOnboardingStatus(workspaceId, "completed");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(localizedError(e, copy.importFailed, locale));
      setLoading(false);
      setProgress(0);
    }
  }

  function selectImportFile(candidate: File | null) {
    if (!candidate) return;

    const isCsv =
      candidate.name.toLowerCase().endsWith(".csv") ||
      candidate.type === "text/csv" ||
      candidate.type === "application/vnd.ms-excel";

    if (!isCsv) {
      setFile(null);
      setError(copy.csvRequired);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setError(copy.fileTooLarge);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setFile(candidate);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (loading) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (loading) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!loading) event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (loading) return;
    selectImportFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleJoin() {
    setLoading(true);
    setError(null);
    try {
      const res = await joinByCode(code);
      if (res.status === "active") {
        router.push("/dashboard");
        router.refresh();
      } else {
        setPendingName(res.workspaceName);
        setStep("pending");
      }
    } catch (e) {
      setError(localizedError(e, copy.invalidCode, locale));
    } finally {
      setLoading(false);
    }
  }

  const setupStep = step === "account" ? 2 : step === "import" ? 3 : step === "groupReady" ? 2 : 1;
  const setupTotal = workspaceType === "group" ? 2 : 3;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--teal)/0.10),transparent_36%)] bg-muted/20">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            {workspaceId && !["pending", "groupReady"].includes(step) && (
              <button
                type="button"
                onClick={() => finish("skipped")}
                disabled={loading}
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 sm:block"
              >
                {copy.later}
              </button>
            )}
            <PublicPreferences labels={{ language: common.language, light: common.light, dark: common.dark }} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-4 py-10 sm:px-6">
        <div className="w-full">
          {workspaceId && ["account", "import", "groupReady"].includes(step) && (
            <ProgressHeader current={setupStep} total={setupTotal} workspaceName={workspaceName} copy={copy} />
          )}

          {step === "loading" && (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {copy.loading}
            </div>
          )}

          {step === "type" && (
            <section className="animate-fade-in">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{copy.welcome}</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.chooseSpace}</h1>
                <p className="mt-3 text-muted-foreground">{copy.chooseSpaceDescription}</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <ChoiceCard icon={<User className="h-6 w-6" />} eyebrow={copy.personalEyebrow} title={copy.personalTitle} description={copy.personalDescription} choose={copy.choose} onClick={() => go("personal")} />
                <ChoiceCard icon={<Users className="h-6 w-6" />} eyebrow={copy.groupEyebrow} title={copy.groupTitle} description={copy.groupDescription} choose={copy.choose} onClick={() => go("group")} />
                <ChoiceCard icon={<Building2 className="h-6 w-6" />} eyebrow={copy.businessEyebrow} title={copy.businessTitle} description={copy.businessDescription} choose={copy.choose} onClick={() => go("proChoice")} />
              </div>
              <button type="button" onClick={() => go("join")} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                <KeyRound className="h-4 w-4" /> {copy.invitationCode}
              </button>
              {error && <ErrorMessage>{error}</ErrorMessage>}
            </section>
          )}

          {step === "personal" && (
            <NameCard title={copy.personalNameTitle} description={copy.personalNameDescription} label={copy.workspaceName} placeholder={copy.personalPlaceholder} value={name} onChange={setName} onBack={() => go("type")} onSubmit={() => handleCreate("personal")} loading={loading} error={error} copy={copy} />
          )}

          {step === "group" && (
            <NameCard title={copy.groupNameTitle} description={copy.groupNameDescription} label={copy.groupName} placeholder={copy.groupPlaceholder} value={name} onChange={setName} onBack={() => go("type")} onSubmit={() => handleCreate("group")} loading={loading} error={error} copy={copy} />
          )}

          {step === "proChoice" && (
            <section className="animate-fade-in">
              <BackButton onClick={() => go("type")} label={copy.back} />
              <h1 className="mt-5 text-3xl font-bold tracking-tight">{copy.companyTitle}</h1>
              <p className="mt-2 text-muted-foreground">{copy.companyDescription}</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <ChoiceCard icon={<Plus className="h-6 w-6" />} eyebrow={copy.newSpace} title={copy.createCompany} description={copy.createCompanyDescription} choose={copy.choose} onClick={() => go("business")} />
                <ChoiceCard icon={<KeyRound className="h-6 w-6" />} eyebrow={copy.invitation} title={copy.joinCompany} description={copy.joinCompanyDescription} choose={copy.choose} onClick={() => go("join")} />
              </div>
            </section>
          )}

          {step === "business" && (
            <NameCard title={copy.companyNameTitle} description={copy.companyNameDescription} label={copy.companyName} placeholder={copy.companyPlaceholder} value={name} onChange={setName} onBack={() => go("proChoice")} onSubmit={() => handleCreate("business")} loading={loading} error={error} copy={copy} />
          )}

          {step === "account" && (
            <SetupCard icon={<Landmark className="h-6 w-6" />} title={copy.accountTitle} description={copy.accountDescription}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account-name">{copy.accountName}</Label>
                  <Input id="account-name" autoFocus placeholder={copy.accountPlaceholder} value={accountName} onChange={(event) => setAccountName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening-balance">{copy.openingBalance}</Label>
                  <div className="relative">
                    <Input id="opening-balance" inputMode="decimal" placeholder="0,00" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} className="pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                {copy.accountHint}
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <Button size="lg" className="mt-6 w-full sm:w-auto" disabled={loading || !accountName.trim()} onClick={handleCreateAccount}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {copy.continueImport}
              </Button>
            </SetupCard>
          )}

          {step === "import" && (
            <SetupCard icon={<FileSpreadsheet className="h-6 w-6" />} title={copy.importTitle} description={copy.importDescription(accountName)}>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" disabled={loading} onChange={(event) => selectImportFile(event.target.files?.[0] ?? null)} />
              <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "group flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    isDragging
                      ? "border-primary bg-primary/10"
                      : file
                        ? "border-teal/50 bg-teal/5 hover:border-teal"
                        : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl transition-colors", isDragging || file ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground")}>
                    {file ? <FileSpreadsheet className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                  </span>
                  <span className="mt-4 font-semibold">
                    {isDragging ? copy.dropHere : file ? file.name : copy.dragFile}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {file ? copy.replaceFile(formatFileSize(file.size, locale, copy.units)) : copy.selectFile}
                  </span>
                </button>
              </div>
              <CsvImportGuide prominent className="mt-5" />
              {loading && progress > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{copy.importProgress}</span><span>{progress} %</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" disabled={loading} onClick={() => finish("skipped")}>{copy.importLater}</Button>
                <Button size="lg" disabled={loading || !file} onClick={handleImport}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {copy.importOpen}
                </Button>
              </div>
            </SetupCard>
          )}

          {step === "groupReady" && (
            <SetupCard icon={<Users className="h-6 w-6" />} title={copy.groupReadyTitle} description={copy.groupReadyDescription}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureLine icon={<Check className="h-4 w-4" />} text={copy.customSplit} />
                <FeatureLine icon={<Check className="h-4 w-4" />} text={copy.confirmedSettlements} />
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <Button size="lg" className="mt-6" disabled={loading} onClick={() => finish("completed")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {copy.openGroup}
              </Button>
            </SetupCard>
          )}

          {step === "join" && (
            <Card className="mx-auto max-w-xl animate-fade-in p-7 sm:p-9">
              <BackButton onClick={() => go("type")} label={copy.back} />
              <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-6 w-6" /></div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">{copy.joinTitle}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{copy.joinDescription}</p>
              <div className="mt-6 space-y-2">
                <Label htmlFor="join-code">{copy.accessCode}</Label>
                <Input id="join-code" autoFocus placeholder="A1B2C3D4" className="font-mono uppercase tracking-[0.2em]" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <Button className="mt-6 w-full" size="lg" disabled={loading || code.trim().length < 4} onClick={handleJoin}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {copy.requestAccess}
              </Button>
            </Card>
          )}

          {step === "pending" && (
            <Card className="mx-auto max-w-xl animate-fade-in p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal"><CheckCircle2 className="h-8 w-8" /></span>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">{copy.requestSent}</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{copy.requestSentDescription(pendingName)}</p>
              <Button variant="outline" className="mt-6" onClick={() => go("type")}><ArrowLeft className="h-4 w-4" />{copy.createInstead}</Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function ProgressHeader({ current, total, workspaceName, copy }: { current: number; total: number; workspaceName: string; copy: OnboardingCopy }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{copy.setup(workspaceName)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.step(current, total)}</p>
      </div>
      <div className="flex w-40 gap-2" aria-label={copy.step(current, total)}>
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < current ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}

function ChoiceCard({ icon, eyebrow, title, description, choose, onClick }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; choose: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-64 flex-col items-start rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">{icon}</span>
      <span className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</span>
      <span className="mt-2 text-xl font-bold tracking-tight">{title}</span>
      <span className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</span>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">{choose} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
    </button>
  );
}

function NameCard({ title, description, label, placeholder, value, onChange, onBack, onSubmit, loading, error, copy }: { title: string; description: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; onBack: () => void; onSubmit: () => void; loading: boolean; error: string | null; copy: OnboardingCopy }) {
  return (
    <Card className="mx-auto max-w-xl animate-fade-in p-7 sm:p-9">
      <BackButton onClick={onBack} label={copy.back} />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-7 space-y-2">
        <Label htmlFor="workspace-name">{label}</Label>
        <Input id="workspace-name" autoFocus placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && value.trim() && !loading) onSubmit(); }} />
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button className="mt-6 w-full" size="lg" disabled={loading || !value.trim()} onClick={onSubmit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {copy.createContinue}
      </Button>
    </Card>
  );
}

function SetupCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="mx-auto max-w-2xl animate-fade-in overflow-hidden">
      <div className="border-b bg-muted/30 p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </Card>
  );
}

function FeatureLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-3 rounded-lg border bg-background p-4 text-sm"><span className="text-teal">{icon}</span>{text}</div>;
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{children}</p>;
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />{label}</button>;
}
