"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { importTransactionsFromCsv } from "@/lib/services/import-transactions";

export function ImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const res = await importTransactionsFromCsv(file);
    setLoading(false);
    e.target.value = ""; // autorise le ré-import du même fichier

    if (res.inserted > 0) {
      toast.success(`${res.inserted} transaction(s) importée(s)`, {
        description:
          res.errors.length > 0
            ? `${res.errors.length} ligne(s) ignorée(s)`
            : undefined,
      });
      router.refresh(); // rafraîchit les données du dashboard
    } else {
      toast.error("Aucune transaction importée", {
        description: res.errors[0] ?? "Vérifiez le format du fichier.",
      });
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size="sm"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {loading ? "Import…" : "Importer un relevé"}
      </Button>
    </>
  );
}
