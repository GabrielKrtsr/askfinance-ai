import Link from "next/link";
import { Check } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const perks = [
  "14 jours d'essai, sans carte bancaire",
  "Import CSV illimité",
  "Copilote IA inclus",
];

export default function SignupPage() {
  return (
    <AuthShell>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Créer votre compte</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Démarrez votre essai gratuit en moins de 2 minutes.
        </p>

        <ul className="mt-5 space-y-1.5">
          {perks.map((p) => (
            <li
              key={p}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Check className="h-4 w-4 text-teal" />
              {p}
            </li>
          ))}
        </ul>

        {/* Formulaire statique — aucune logique de soumission */}
        <form className="mt-7 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstname">Prénom</Label>
              <Input id="firstname" placeholder="Camille" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Nom</Label>
              <Input id="lastname" placeholder="Moreau" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Entreprise (facultatif)</Label>
            <Input
              id="company"
              placeholder="Atelier Dupont SARL — laissez vide pour un usage perso"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" type="email" placeholder="vous@entreprise.fr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" placeholder="8 caractères minimum" />
          </div>

          {/* Lien vers l'onboarding (UI uniquement) */}
          <Button asChild className="w-full" size="lg">
            <Link href="/onboarding">Créer mon compte</Link>
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          En créant un compte, vous acceptez nos{" "}
          <Link href="#" className="underline">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link href="#" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
