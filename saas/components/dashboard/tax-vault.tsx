"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PiggyBank,
  CalendarClock,
  Settings2,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEUR, formatDateFr } from "@/lib/utils";
import {
  getTaxVault,
  getTaxSettings,
  saveTaxSettings,
  DEFAULT_TAX_SETTINGS,
  type TaxVault as TaxVaultData,
  type TaxSettings,
} from "@/lib/services/tax";

const TYPE_DOT: Record<string, string> = {
  tva: "bg-indigo-500",
  social: "bg-amber-500",
  is: "bg-rose-500",
};

export function TaxVault({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [vault, setVault] = useState<TaxVaultData | null>(null);
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [v, s] = await Promise.all([
        getTaxVault(workspaceId),
        getTaxSettings(workspaceId),
      ]);
      setVault(v);
      setSettings(s);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const ok = await saveTaxSettings(workspaceId, settings);
    setSaving(false);
    if (!ok) {
      toast.error("Impossible d'enregistrer les réglages fiscaux.");
      return;
    }
    toast.success("Réglages enregistrés", {
      description: "La prévision de trésorerie intègre désormais vos échéances.",
    });
    setEditing(false);
    await load();
    router.refresh(); // met à jour la prévision (alerte découvert) côté serveur
  }

  function num(value: string): number {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  const activeDetail = vault?.detail.filter((d) => d.taux > 0) ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Coffre-fort fiscal
          </CardTitle>
          <CardDescription>
            Ce qu'il faut mettre de côté pour la TVA, l'URSSAF et l'impôt
          </CardDescription>
        </div>
        {!loading && !error && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Settings2 className="h-4 w-4" />
            Régler
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Calcul des provisions…
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Coffre-fort indisponible. Le serveur d'analyse est-il démarré ?
          </p>
        ) : (
          <div className="space-y-4">
            {/* Formulaire de réglages */}
            {editing && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Pourcentage de votre chiffre d'affaires à provisionner pour
                  chaque poste. Demandez les bons taux à votre expert-comptable.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["provision_tva_taux", "TVA %"],
                      ["provision_social_taux", "URSSAF %"],
                      ["provision_is_taux", "Impôt %"],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {label}
                      </label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={String(settings[field])}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            [field]: num(e.target.value),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Périodicité TVA
                    </label>
                    <Select
                      value={settings.tva_periodicite}
                      onValueChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          tva_periodicite: v as TaxSettings["tva_periodicite"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensuel">Mensuelle</SelectItem>
                        <SelectItem value="trimestriel">Trimestrielle</SelectItem>
                        <SelectItem value="annuel">Annuelle</SelectItem>
                        <SelectItem value="aucun">Franchise (aucune)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Périodicité URSSAF
                    </label>
                    <Select
                      value={settings.urssaf_periodicite}
                      onValueChange={(v) =>
                        setSettings((s) => ({
                          ...s,
                          urssaf_periodicite:
                            v as TaxSettings["urssaf_periodicite"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensuel">Mensuelle</SelectItem>
                        <SelectItem value="trimestriel">Trimestrielle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Enregistrer"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {!vault?.configure && !editing ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PiggyBank className="h-5 w-5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Définissez les % de votre CA à mettre de côté et AskFinance
                  calcule votre provision et intègre vos échéances (TVA, URSSAF,
                  impôt) à la prévision de trésorerie.
                </p>
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Settings2 className="h-4 w-4" />
                  Configurer
                </Button>
              </div>
            ) : (
              vault && (
                <>
                  {/* Provision mensuelle recommandée */}
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">
                      À provisionner ce mois-ci
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">
                      {formatEUR(vault.provision_mensuelle)}
                    </p>
                    {activeDetail.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {activeDetail.map((d) => (
                          <div
                            key={d.type}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${TYPE_DOT[d.type]}`}
                            />
                            <span className="flex-1 text-muted-foreground">
                              {d.poste} ({d.taux} %)
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatEUR(d.montant_mensuel)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prochaines échéances */}
                  {vault.echeances.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Prochaines échéances (estimées)
                      </p>
                      <ul className="divide-y">
                        {vault.echeances.slice(0, 5).map((e, i) => (
                          <li
                            key={`${e.type}-${e.date}-${i}`}
                            className="flex items-center justify-between py-2 text-sm"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${TYPE_DOT[e.type]}`}
                              />
                              {e.libelle}
                              <span className="text-xs text-muted-foreground">
                                {formatDateFr(e.date)}
                              </span>
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatEUR(e.montant_estime)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Montants indicatifs, estimés sur votre CA. À valider avec
                    votre expert-comptable.
                  </p>
                </>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
