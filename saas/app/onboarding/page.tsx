"use client";

import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

type WorkspaceKind = "personal" | "business" | "group";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        setError(e instanceof Error ? e.message : "Impossible de reprendre la configuration.");
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
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccount() {
    setLoading(true);
    setError(null);
    const normalized = Number(openingBalance.trim().replace(",", ".") || "0");
    if (!Number.isFinite(normalized)) {
      setError("Le solde initial doit être un nombre valide.");
      setLoading(false);
      return;
    }

    try {
      const account = await createAccount(accountName.trim(), normalized);
      if (!account) throw new Error("Création du compte impossible.");
      setAccountId(account.id);
      setStep("import");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création du compte impossible.");
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
      setError(e instanceof Error ? e.message : "Impossible de terminer la configuration.");
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
              ? "Ce relevé ne contient aucune nouvelle transaction."
              : "Aucune transaction exploitable n'a été trouvée.")
        );
      }
      await setOnboardingStatus(workspaceId, "completed");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
      setLoading(false);
      setProgress(0);
    }
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
      setError(e instanceof Error ? e.message : "Code invalide.");
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
          {workspaceId && !["pending", "groupReady"].includes(step) && (
            <button
              type="button"
              onClick={() => finish("skipped")}
              disabled={loading}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Configurer plus tard
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-4 py-10 sm:px-6">
        <div className="w-full">
          {workspaceId && ["account", "import", "groupReady"].includes(step) && (
            <ProgressHeader current={setupStep} total={setupTotal} workspaceName={workspaceName} />
          )}

          {step === "loading" && (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Préparation de votre espace
            </div>
          )}

          {step === "type" && (
            <section className="animate-fade-in">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Bienvenue sur AskFinance</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Quel espace voulez-vous préparer ?</h1>
                <p className="mt-3 text-muted-foreground">Votre choix adapte le vocabulaire, les outils et le tableau de bord. Vous pourrez créer d'autres espaces plus tard.</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <ChoiceCard icon={<User className="h-6 w-6" />} eyebrow="B2C Solo" title="Mes finances" description="Budget, dépenses, revenus et reste à vivre dans un espace personnel." onClick={() => go("personal")} />
                <ChoiceCard icon={<Users className="h-6 w-6" />} eyebrow="B2C Groupe" title="Un groupe ou foyer" description="Dépenses partagées, parts personnalisées et règlements entre membres." onClick={() => go("group")} />
                <ChoiceCard icon={<Building2 className="h-6 w-6" />} eyebrow="B2B Entreprise" title="Une entreprise" description="Trésorerie, encaissements, fiscalité, workflows et équipe." onClick={() => go("proChoice")} />
              </div>
              <button type="button" onClick={() => go("join")} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                <KeyRound className="h-4 w-4" /> J'ai un code d'invitation
              </button>
              {error && <ErrorMessage>{error}</ErrorMessage>}
            </section>
          )}

          {step === "personal" && (
            <NameCard title="Nommez votre espace personnel" description="Un nom simple pour le reconnaître dans le sélecteur d'espaces." label="Nom de l'espace" placeholder="Mon budget" value={name} onChange={setName} onBack={() => go("type")} onSubmit={() => handleCreate("personal")} loading={loading} error={error} />
          )}

          {step === "group" && (
            <NameCard title="Nommez votre groupe" description="Pour un couple, une famille, une colocation ou un projet commun." label="Nom du groupe" placeholder="Maison" value={name} onChange={setName} onBack={() => go("type")} onSubmit={() => handleCreate("group")} loading={loading} error={error} />
          )}

          {step === "proChoice" && (
            <section className="animate-fade-in">
              <BackButton onClick={() => go("type")} />
              <h1 className="mt-5 text-3xl font-bold tracking-tight">Votre entreprise</h1>
              <p className="mt-2 text-muted-foreground">Créez un nouvel espace ou rejoignez une équipe existante.</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <ChoiceCard icon={<Plus className="h-6 w-6" />} eyebrow="Nouvel espace" title="Créer mon entreprise" description="Vous devenez propriétaire de l'espace et pourrez inviter votre équipe." onClick={() => go("business")} />
                <ChoiceCard icon={<KeyRound className="h-6 w-6" />} eyebrow="Invitation" title="Rejoindre une entreprise" description="Utilisez le code transmis par un responsable de l'espace." onClick={() => go("join")} />
              </div>
            </section>
          )}

          {step === "business" && (
            <NameCard title="Créez votre espace entreprise" description="Utilisez le nom commercial que vous reconnaissez immédiatement." label="Nom de l'entreprise" placeholder="Mon entreprise" value={name} onChange={setName} onBack={() => go("proChoice")} onSubmit={() => handleCreate("business")} loading={loading} error={error} />
          )}

          {step === "account" && (
            <SetupCard icon={<Landmark className="h-6 w-6" />} title="Ajoutez votre premier compte" description="Le solde initial sert de point de départ avant l'ajout des mouvements du relevé.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="account-name">Nom du compte</Label>
                  <Input id="account-name" autoFocus placeholder="Compte principal" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening-balance">Solde avant le premier relevé</Label>
                  <div className="relative">
                    <Input id="opening-balance" inputMode="decimal" placeholder="0,00" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} className="pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                Vous pourrez ajouter d'autres comptes et corriger ce solde depuis votre espace.
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <Button size="lg" className="mt-6 w-full sm:w-auto" disabled={loading || !accountName.trim()} onClick={handleCreateAccount}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continuer vers l'import
              </Button>
            </SetupCard>
          )}

          {step === "import" && (
            <SetupCard icon={<FileSpreadsheet className="h-6 w-6" />} title="Importez votre premier relevé" description={`Les transactions seront ajoutées à ${accountName || "votre compte"}. L'import CSV reste facultatif.`}>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className={cn("flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors", file ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40")}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload className="h-5 w-5" /></span>
                <span className="mt-3 font-semibold">{file ? file.name : "Choisir un fichier CSV"}</span>
                <span className="mt-1 text-sm text-muted-foreground">Taille maximale 10 Mo</span>
              </button>
              <CsvImportGuide prominent className="mt-5" />
              {loading && progress > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Import en cours</span><span>{progress} %</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" disabled={loading} onClick={() => finish("skipped")}>Importer plus tard</Button>
                <Button size="lg" disabled={loading || !file} onClick={handleImport}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Importer et ouvrir le tableau de bord
                </Button>
              </div>
            </SetupCard>
          )}

          {step === "groupReady" && (
            <SetupCard icon={<Users className="h-6 w-6" />} title="Votre groupe est prêt" description="Ajoutez ensuite les dépenses partagées et invitez les autres membres depuis l'onglet Membres.">
              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureLine icon={<Check className="h-4 w-4" />} text="Répartition personnalisée par membre" />
                <FeatureLine icon={<Check className="h-4 w-4" />} text="Règlements confirmés ou contestés" />
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <Button size="lg" className="mt-6" disabled={loading} onClick={() => finish("completed")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Ouvrir le groupe
              </Button>
            </SetupCard>
          )}

          {step === "join" && (
            <Card className="mx-auto max-w-xl animate-fade-in p-7 sm:p-9">
              <BackButton onClick={() => go("type")} />
              <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-6 w-6" /></div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">Rejoindre un espace</h1>
              <p className="mt-2 text-sm text-muted-foreground">Saisissez le code reçu. Un responsable devra valider votre demande.</p>
              <div className="mt-6 space-y-2">
                <Label htmlFor="join-code">Code d'accès</Label>
                <Input id="join-code" autoFocus placeholder="A1B2C3D4" className="font-mono uppercase tracking-[0.2em]" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
              </div>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <Button className="mt-6 w-full" size="lg" disabled={loading || code.trim().length < 4} onClick={handleJoin}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Demander l'accès
              </Button>
            </Card>
          )}

          {step === "pending" && (
            <Card className="mx-auto max-w-xl animate-fade-in p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal"><CheckCircle2 className="h-8 w-8" /></span>
              <h1 className="mt-5 text-2xl font-bold tracking-tight">Demande envoyée</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Votre demande pour <strong>{pendingName}</strong> a été transmise. Vous aurez accès aux données après validation par un responsable.</p>
              <Button variant="outline" className="mt-6" onClick={() => go("type")}><ArrowLeft className="h-4 w-4" />Créer un espace à la place</Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function ProgressHeader({ current, total, workspaceName }: { current: number; total: number; workspaceName: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Configuration de {workspaceName}</p>
        <p className="mt-1 text-xs text-muted-foreground">Étape {current} sur {total}</p>
      </div>
      <div className="flex w-40 gap-2" aria-label={`Étape ${current} sur ${total}`}>
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < current ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}

function ChoiceCard({ icon, eyebrow, title, description, onClick }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-64 flex-col items-start rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">{icon}</span>
      <span className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</span>
      <span className="mt-2 text-xl font-bold tracking-tight">{title}</span>
      <span className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</span>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Choisir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
    </button>
  );
}

function NameCard({ title, description, label, placeholder, value, onChange, onBack, onSubmit, loading, error }: { title: string; description: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; onBack: () => void; onSubmit: () => void; loading: boolean; error: string | null }) {
  return (
    <Card className="mx-auto max-w-xl animate-fade-in p-7 sm:p-9">
      <BackButton onClick={onBack} />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-7 space-y-2">
        <Label htmlFor="workspace-name">{label}</Label>
        <Input id="workspace-name" autoFocus placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && value.trim() && !loading) onSubmit(); }} />
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button className="mt-6 w-full" size="lg" disabled={loading || !value.trim()} onClick={onSubmit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Créer et continuer
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

function BackButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />Retour</button>;
}
