"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

const TYPE_DOT: Record<string, string> = {
  tva: "bg-indigo-500",
  social: "bg-amber-500",
  is: "bg-rose-500",
};

export function TaxVault({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const [vault, setVault] = useState<TaxVaultData | null>(null);
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
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
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    const ok = await saveTaxSettings(workspaceId, settings);
    setSaving(false);
    if (!ok) {
      toast.error(copy.tax.saveFailed);
      return;
    }
    toast.success(copy.tax.saved, {
      description: copy.tax.forecastUpdated,
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
            {copy.tax.title}
          </CardTitle>
          <CardDescription>
            {copy.tax.description}
          </CardDescription>
        </div>
        {!loading && !error && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Settings2 className="h-4 w-4" />
            {copy.tax.edit}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.tax.calculating}
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {copy.tax.unavailable}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Formulaire de réglages */}
            {editing && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  {copy.tax.rateHint}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["provision_tva_taux", `${copy.tax.vat} %`],
                      ["provision_social_taux", `${copy.tax.social} %`],
                      ["provision_is_taux", `${copy.tax.incomeTax} %`],
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
                      {copy.tax.vatFrequency}
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
                        <SelectItem value="mensuel">{copy.tax.monthly}</SelectItem>
                        <SelectItem value="trimestriel">{copy.tax.quarterly}</SelectItem>
                        <SelectItem value="annuel">{copy.tax.yearly}</SelectItem>
                        <SelectItem value="aucun">{copy.tax.exempt}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {copy.tax.socialFrequency}
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
                        <SelectItem value="mensuel">{copy.tax.monthly}</SelectItem>
                        <SelectItem value="trimestriel">{copy.tax.quarterly}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      copy.common.save
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    {copy.common.cancel}
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
                  {copy.tax.empty}
                </p>
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Settings2 className="h-4 w-4" />
                  {copy.common.configure}
                </Button>
              </div>
            ) : (
              vault && (
                <>
                  {/* Provision mensuelle recommandée */}
                  <div className="rounded-lg bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">
                      {copy.tax.provision}
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
                              {(d.type === "tva" ? copy.tax.vat : d.type === "social" ? copy.tax.social : d.type === "is" ? copy.tax.incomeTax : d.poste)} ({d.taux} %)
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
                        {copy.tax.deadlines}
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
                    {copy.tax.disclaimer}
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
