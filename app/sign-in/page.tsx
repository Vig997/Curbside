import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeNextPath } from "@/lib/safe-redirect";
import { getCurrentUserProfile } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google to reserve spots or manage your listings.",
  robots: { index: false, follow: false }
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Google did not return a sign-in code. Start over from the sign-in button.",
  oauth_failed: "Google sign-in failed. Check your Supabase Google provider settings and try again."
};

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [{ next, error }, { user }] = await Promise.all([searchParams, getCurrentUserProfile()]);
  const safeNext = sanitizeNextPath(next);

  if (user) {
    redirect(safeNext);
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Authentication was not completed. Please try again.") : null;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(13,148,136,0.95),rgba(15,23,42,0.95))] text-white">
          <CardContent className="space-y-6 p-8">
            <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              Driver + host access
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-4xl font-semibold leading-tight">
                Sign in once. Reserve or list in seconds.
              </h1>
              <p className="max-w-lg text-sm text-white/75">
                Google sign-in unlocks reservations, host listing management, and photo uploads.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>Sign in to Curbside</CardTitle>
            <CardDescription>Continue with Google to reserve spots and manage listings.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-5 text-center">
            {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
            <GoogleSignInButton next={safeNext} />
            <div className="text-sm text-muted-foreground">
              Need to browse first?{" "}
              <Link href="/explore" className="font-medium text-foreground underline-offset-4 hover:underline">
                Open the map
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
