import { NextResponse } from "next/server";

import { deriveProfileName } from "@/lib/helpers/profile";
import { sanitizeNextPath } from "@/lib/helpers/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession", error);
    return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: deriveProfileName(user),
      avatar_url: user.user_metadata.avatar_url ?? null,
      email: user.email ?? null
    });

    if (profileError) {
      console.error("[auth/callback] profile upsert", profileError);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
