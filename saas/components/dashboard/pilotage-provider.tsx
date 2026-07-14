"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { getPilotageData, type PilotageData } from "@/lib/services/pilotage";

interface PilotageContextValue {
  data: PilotageData | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const PilotageContext = createContext<PilotageContextValue | null>(null);

// Les widgets de la page Pilotage lisent ce contexte quand il est présent :
// un seul appel API partagé pour prévision + récurrents + encaissements.
// Hors provider (widget monté seul ailleurs), chacun garde son propre fetch.
export function usePilotage(): PilotageContextValue | null {
  return useContext(PilotageContext);
}

export function PilotageProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<PilotageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await getPilotageData(workspaceId));
      setError(false);
    } catch {
      setError(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <PilotageContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </PilotageContext.Provider>
  );
}
