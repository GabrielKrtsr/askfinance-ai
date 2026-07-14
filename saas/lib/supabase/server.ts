import { cache } from "react";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : Next.js interdit d'écrire un
            // cookie ici. Ignorable, le middleware rafraîchit la session.
          }
        },
      },
    }
  );
}

// Utilisateur connecté, mémoïsé par requête : `auth.getUser()` fait un
// aller-retour réseau vers Supabase Auth. Sans ce cache, chaque helper
// (profil, espaces, membres…) le repaierait, même lancés en parallèle.
export const getAuthUser = cache(async () => {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
});
