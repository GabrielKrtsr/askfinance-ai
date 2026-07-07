"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/data/workspace";

// Déconnexion côté serveur : révoque la session Supabase ET efface le cookie
// d'espace courant. Sans ça, `af_workspace` survit à la déconnexion et "fuit"
// vers la session suivante (impression que l'ancien utilisateur reste présent).
export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  cookies().delete(WORKSPACE_COOKIE);
}
