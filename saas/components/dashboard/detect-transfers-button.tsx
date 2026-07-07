"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { detectTransfers } from "@/lib/services/transfers";

export function DetectTransfersButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const n = await detectTransfers(workspaceId);
      if (n > 0) {
        toast.success(`${n} mouvement(s) marqué(s) comme virement interne`);
        router.refresh();
      } else {
        toast.info("Aucun virement interne détecté");
      }
    } catch {
      toast.error("Détection indisponible", {
        description: "Le serveur d'analyse est-il démarré ?",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowLeftRight className="h-4 w-4" />
      )}
      Détecter virements
    </Button>
  );
}
