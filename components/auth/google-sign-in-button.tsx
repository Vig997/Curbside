"use client";

import { startTransition, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface GoogleSignInButtonProps {
  next?: string;
}

export function GoogleSignInButton({ next = "/" }: GoogleSignInButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      if (!supabase) {
        setError("Supabase is not configured. Add your env variables and restart the dev server.");
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });

      if (signInError) {
        setError(signInError.message);
      }
    });
  };

  return (
    <div className="flex w-full max-w-xs flex-col items-center space-y-2">
      <Button type="button" variant="outline" className="w-full justify-center" onClick={handleClick}>
        Continue with Google
      </Button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

