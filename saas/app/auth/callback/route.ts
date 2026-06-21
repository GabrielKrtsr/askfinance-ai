import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback OAuth : Google (via Supabase) renvoie ici avec un "code".
// On l'échange contre une session, ce qui pose les cookies, puis on redirige.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
