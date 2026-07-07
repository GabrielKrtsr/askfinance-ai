import { createClient } from "@supabase/supabase-js";

// Client Supabase à privilèges (SERVICE_ROLE) — SERVEUR UNIQUEMENT.
// ⚠️ Contourne la RLS : à n'utiliser que dans des Server Actions / Route Handlers
// de confiance, APRÈS avoir validé l'utilisateur. Ne jamais importer côté client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
