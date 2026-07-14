"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

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
      toast.error("Profil entreprise non enregistré.", { description: error.message });
      return;
    }
    toast.success("Profil entreprise enregistré");
  }

  const fields: { key: keyof CompanyForm; label: string; placeholder: string }[] = [
    { key: "legal_name", label: "Raison sociale", placeholder: "AskFinance SAS" },
    { key: "siret", label: "SIRET", placeholder: "123 456 789 00012" },
    { key: "vat_number", label: "N° de TVA", placeholder: "FR…" },
    { key: "legal_form", label: "Forme juridique", placeholder: "SAS, SARL, EI…" },
    { key: "tax_regime", label: "Régime fiscal", placeholder: "IS, IR, micro…" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Profil entreprise</CardTitle>
        <CardDescription>Ces informations personnalisent la fiscalité, la facture électronique et les conseils de Yassia.</CardDescription>
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
            <div className="flex items-end"><Button onClick={save} disabled={saving}><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
