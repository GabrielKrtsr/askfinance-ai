"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  KeyRound,
  Loader2,
  Plus,
  User,
  Users,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspace, joinByCode } from "@/lib/actions/workspaces";
import { cn } from "@/lib/utils";

type Step =
  | "type"
  | "personal"
  | "group"
  | "proChoice"
  | "business"
  | "join"
  | "pending";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (!invite) return;
    setCode(invite.trim().toUpperCase());
    setStep("join");
  }, []);

  function go(next: Step) {
    setError(null);
    setStep(next);
  }

  async function handleCreate(type: "personal" | "business" | "group") {
    setLoading(true);
    setError(null);
    try {
      await createWorkspace({ type, name: name.trim() });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setLoading(false);
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
        go("pending");
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code invalide.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {/* Étape 1 : Perso ou Pro */}
        {step === "type" && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight">Que voulez-vous gérer ?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous pourrez ajouter d'autres espaces plus tard.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <ChoiceCard
                icon={<User className="h-6 w-6" />}
                title="Mes finances perso"
                description="Budget, dépenses et épargne pour vous seul."
                onClick={() => go("personal")}
              />
              <ChoiceCard
                icon={<Users className="h-6 w-6" />}
                title="Un groupe / foyer"
                description="Dépenses partagées à plusieurs (couple, coloc, famille)."
                onClick={() => go("group")}
              />
              <ChoiceCard
                icon={<Building2 className="h-6 w-6" />}
                title="Une entreprise"
                description="Trésorerie, fiscalité et encaissements en équipe."
                onClick={() => go("proChoice")}
              />
            </div>
            <button
              type="button"
              onClick={() => go("join")}
              className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Vous avez un{" "}
              <span className="font-medium text-primary">code d'invitation</span> ?
              Rejoindre un espace
            </button>
          </div>
        )}

        {/* Étape 2a : Nom de l'espace perso */}
        {step === "personal" && (
          <FormCard
            title="Nommez votre espace perso"
            description="Par exemple « Mon budget » ou votre prénom."
            onBack={() => go("type")}
            error={error}
          >
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nom de l'espace</Label>
              <Input
                id="ws-name"
                autoFocus
                placeholder="Mon budget"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={loading || !name.trim()}
              onClick={() => handleCreate("personal")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Créer mon espace
            </Button>
          </FormCard>
        )}

        {/* Étape 2c : Nom du groupe */}
        {step === "group" && (
          <FormCard
            title="Nommez votre groupe"
            description="Par exemple « Maison », « Gabriel & Clara » ou « Coloc »."
            onBack={() => go("type")}
            error={error}
          >
            <div className="space-y-2">
              <Label htmlFor="grp-name">Nom du groupe</Label>
              <Input
                id="grp-name"
                autoFocus
                placeholder="Gabriel & Clara"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={loading || !name.trim()}
              onClick={() => handleCreate("group")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Créer le groupe
            </Button>
          </FormCard>
        )}

        {/* Étape 2b : Créer ou rejoindre une entreprise */}
        {step === "proChoice" && (
          <div className="animate-fade-in">
            <BackButton onClick={() => go("type")} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Votre entreprise</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Créez-la, ou rejoignez-en une existante avec un code.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ChoiceCard
                icon={<Plus className="h-6 w-6" />}
                title="Créer une entreprise"
                description="Vous démarrez un nouvel espace et en êtes responsable."
                onClick={() => go("business")}
              />
              <ChoiceCard
                icon={<KeyRound className="h-6 w-6" />}
                title="Rejoindre une entreprise"
                description="On vous a donné un code d'accès."
                onClick={() => go("join")}
              />
            </div>
          </div>
        )}

        {/* Étape 3a : Nom de l'entreprise */}
        {step === "business" && (
          <FormCard
            title="Nom de l'entreprise"
            description="Le nom affiché de votre espace."
            onBack={() => go("proChoice")}
            error={error}
          >
            <div className="space-y-2">
              <Label htmlFor="co-name">Nom de l'entreprise</Label>
              <Input
                id="co-name"
                autoFocus
                placeholder="AskFinance SAS"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={loading || !name.trim()}
              onClick={() => handleCreate("business")}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Créer l'entreprise
            </Button>
          </FormCard>
        )}

        {/* Étape 3b : Rejoindre par code */}
        {step === "join" && (
          <FormCard
            title="Rejoindre un espace"
            description="Vérifiez le code d'invitation puis envoyez votre demande d'accès."
            onBack={() => go("type")}
            error={error}
          >
            <div className="space-y-2">
              <Label htmlFor="join-code">Code d'accès</Label>
              <Input
                id="join-code"
                autoFocus
                placeholder="A1B2C3D4"
                className="font-mono uppercase tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={loading || code.trim().length < 4}
              onClick={handleJoin}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Demander l'accès
            </Button>
          </FormCard>
        )}

        {/* Étape 4 : Demande envoyée, en attente de validation */}
        {step === "pending" && (
          <Card className="animate-fade-in p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 text-teal">
              <Check className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-xl font-bold tracking-tight">Demande envoyée</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Votre demande d'accès à <strong>{pendingName}</strong> a bien été transmise.
              Un responsable doit la valider avant que vous puissiez voir les données.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => go("type")}>
              <ArrowLeft className="h-4 w-4" />
              Créer un espace à la place
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-background p-5 text-left transition-colors",
        "hover:border-primary/60 hover:bg-primary/5"
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  );
}

function FormCard({
  title,
  description,
  onBack,
  error,
  children,
}: {
  title: string;
  description: string;
  onBack: () => void;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card className="animate-fade-in p-8">
      <BackButton onClick={onBack} />
      <h1 className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </Card>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Retour
    </button>
  );
}
