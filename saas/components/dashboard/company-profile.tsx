"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { dashboardCopy } from "@/lib/i18n/dashboard";

interface CompanyForm {
  legal_name: string;
  siret: string;
  vat_number: string;
  legal_form: string;
  tax_regime: string;
}

const EMPTY: CompanyForm = {
  legal_name: "",
  siret: "",
  vat_number: "",
  legal_form: "",
  tax_regime: "",
};

export function CompanyProfile({ workspaceId }: { workspaceId: string }) {
  const { locale } = useI18n();
  const copy = dashboardCopy[locale];
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("companies")
      .select("legal_name, siret, vat_number, legal_form, tax_regime")
      .eq("workspace_id", workspaceId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            legal_name: data.legal_name ?? "",
            siret: data.siret ?? "",
            vat_number: data.vat_number ?? "",
            legal_form: data.legal_form ?? "",
            tax_regime: data.tax_regime ?? "",
          });
        }
        setLoading(false);
      });
  }, [workspaceId]);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("companies").upsert(
      {
        workspace_id: workspaceId,
        ...Object.fromEntries(
          Object.entries(form).map(([key, value]) => [key, value.trim() || null])
        ),
      },
      { onConflict: "workspace_id" }
    );
    setSaving(false);
    if (error) {
      toast.error(copy.company.failed, { description: error.message });
      return;
    }
    toast.success(copy.company.saved);
  }

  const fields: { key: keyof CompanyForm; label: string; placeholder: string }[] = [
    { key: "legal_name", label: copy.company.legalName, placeholder: "AskFinance SAS" },
    { key: "siret", label: "SIRET", placeholder: "123 456 789 00012" },
    { key: "vat_number", label: copy.company.vatNumber, placeholder: "FR…" },
    { key: "legal_form", label: copy.company.legalForm, placeholder: "SAS, SARL, EI…" },
    { key: "tax_regime", label: copy.company.taxRegime, placeholder: "IS, IR, micro…" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{copy.company.title}</CardTitle>
        <CardDescription>{copy.company.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {fields.map((field) => (
              <label key={field.key} className="space-y-1 text-xs font-medium text-muted-foreground">
                {field.label}
                <Input value={form[field.key]} placeholder={field.placeholder} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
              </label>
            ))}
            <div className="flex items-end"><Button onClick={save} disabled={saving}><Save className="h-4 w-4" />{saving ? copy.company.saving : copy.common.save}</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
